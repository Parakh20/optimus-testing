-- Sentry errors, stored for the scheduled Claude Code agent that fixes them.
--
-- Flow: Sentry integration webhook -> sentry-webhook Edge Function (HMAC
-- verified) -> record_sentry_event() -> error_events. The agent reads and
-- updates rows through the error-queue Edge Function with its own token
-- (ERROR_AGENT_TOKEN), never the platform admin token.
--
-- Same posture as billing_events / inbound_emails: RLS enabled, NO policies,
-- service-role only. Error text is partly visitor-controlled (exception
-- messages, URLs) and must never be reachable from a tenant session.

CREATE TABLE IF NOT EXISTS public.error_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One row per Sentry issue; repeat events bump event_count instead of
  -- creating rows, so the agent sees each bug once.
  sentry_issue_id text NOT NULL UNIQUE,
  short_id        text,
  title           text,
  culprit         text,
  level           text,
  platform        text,
  project_slug    text,
  web_url         text,
  environment     text,
  release         text,
  event_count     integer NOT NULL DEFAULT 1,
  first_seen      timestamptz,
  last_seen       timestamptz,
  -- Frames of the latest event that carried one (event_alert deliveries do,
  -- issue deliveries do not).
  stacktrace      jsonb,
  last_payload    jsonb,
  -- NEW -> IN_PROGRESS (agent claimed) -> FIXED | NEEDS_HUMAN | WONT_FIX.
  -- A new event on a FIXED row reopens it as NEW: the fix did not hold.
  status          text NOT NULL DEFAULT 'NEW'
                  CHECK (status IN ('NEW', 'IN_PROGRESS', 'FIXED', 'NEEDS_HUMAN', 'WONT_FIX')),
  reopened_count  integer NOT NULL DEFAULT 0,
  claimed_at      timestamptz,
  fix_pr_url      text,
  agent_notes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_events_status ON public.error_events(status, event_count DESC);

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
-- No policies — service role only. Do not add one.

-- Webhook delivery ledger. Sentry retries, and a retry must not double-count.
CREATE TABLE IF NOT EXISTS public.sentry_webhook_deliveries (
  request_id  text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sentry_webhook_deliveries ENABLE ROW LEVEL SECURITY;
-- No policies — service role only.

-- Idempotent on _request_id. Returns 'duplicate', 'stored' or 'reopened'.
CREATE OR REPLACE FUNCTION record_sentry_event(
  _request_id      TEXT,
  _sentry_issue_id TEXT,
  _action          TEXT,
  _short_id        TEXT,
  _title           TEXT,
  _culprit         TEXT,
  _level           TEXT,
  _platform        TEXT,
  _project_slug    TEXT,
  _web_url         TEXT,
  _environment     TEXT,
  _release         TEXT,
  _event_count     INTEGER,
  _first_seen      TIMESTAMPTZ,
  _last_seen       TIMESTAMPTZ,
  _stacktrace      JSONB,
  _payload         JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted INT;
  prior_status TEXT;
BEGIN
  INSERT INTO sentry_webhook_deliveries (request_id) VALUES (_request_id)
  ON CONFLICT (request_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    RETURN 'duplicate';
  END IF;

  SELECT status INTO prior_status FROM error_events WHERE sentry_issue_id = _sentry_issue_id FOR UPDATE;

  IF prior_status IS NULL THEN
    INSERT INTO error_events (
      sentry_issue_id, short_id, title, culprit, level, platform, project_slug,
      web_url, environment, release, event_count, first_seen, last_seen,
      stacktrace, last_payload
    ) VALUES (
      _sentry_issue_id, _short_id, _title, _culprit, _level, _platform, _project_slug,
      _web_url, _environment, _release, COALESCE(_event_count, 1),
      COALESCE(_first_seen, now()), COALESCE(_last_seen, now()),
      _stacktrace, _payload
    );
    RETURN 'stored';
  END IF;

  -- Sentry's own resolve/ignore actions are status changes made by a person in
  -- Sentry, not new occurrences: record the payload, leave our status alone.
  UPDATE error_events SET
    short_id     = COALESCE(_short_id, short_id),
    title        = COALESCE(_title, title),
    culprit      = COALESCE(_culprit, culprit),
    level        = COALESCE(_level, level),
    platform     = COALESCE(_platform, platform),
    project_slug = COALESCE(_project_slug, project_slug),
    web_url      = COALESCE(_web_url, web_url),
    environment  = COALESCE(_environment, environment),
    release      = COALESCE(_release, release),
    event_count  = CASE
                     WHEN _action IN ('resolved', 'ignored', 'archived', 'assigned') THEN event_count
                     ELSE GREATEST(event_count + 1, COALESCE(_event_count, 0))
                   END,
    last_seen    = COALESCE(_last_seen, last_seen),
    stacktrace   = COALESCE(_stacktrace, stacktrace),
    last_payload = _payload,
    status       = CASE
                     WHEN prior_status = 'FIXED' AND _action NOT IN ('resolved', 'ignored', 'archived', 'assigned')
                       THEN 'NEW'
                     ELSE status
                   END,
    reopened_count = CASE
                     WHEN prior_status = 'FIXED' AND _action NOT IN ('resolved', 'ignored', 'archived', 'assigned')
                       THEN reopened_count + 1
                     ELSE reopened_count
                   END,
    updated_at   = now()
  WHERE sentry_issue_id = _sentry_issue_id;

  IF prior_status = 'FIXED' AND _action NOT IN ('resolved', 'ignored', 'archived', 'assigned') THEN
    RETURN 'reopened';
  END IF;
  RETURN 'stored';
END;
$$;

REVOKE ALL ON FUNCTION record_sentry_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_sentry_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, JSONB) TO service_role;

-- Atomic claim for the agent. Takes one NEW row (most frequent first), or an
-- IN_PROGRESS row whose claim is older than _stale_minutes (a run that died).
CREATE OR REPLACE FUNCTION claim_error_event(_stale_minutes INTEGER DEFAULT 180)
RETURNS SETOF error_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE error_events e SET status = 'IN_PROGRESS', claimed_at = now(), updated_at = now()
  WHERE e.id = (
    SELECT id FROM error_events
    WHERE status = 'NEW'
       OR (status = 'IN_PROGRESS' AND claimed_at < now() - make_interval(mins => _stale_minutes))
    ORDER BY (status = 'NEW') DESC, event_count DESC, created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING e.*;
END;
$$;

REVOKE ALL ON FUNCTION claim_error_event(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_error_event(INTEGER) TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.error_events TO service_role;
GRANT SELECT, INSERT ON public.sentry_webhook_deliveries TO service_role;
