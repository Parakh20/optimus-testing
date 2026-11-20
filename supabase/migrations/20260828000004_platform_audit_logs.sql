-- =============================================================================
-- Migration: platform_audit_logs — a record of what was done with the platform
-- token
-- =============================================================================
--
-- The platform token is one shared secret that acts with the service-role key
-- across every tenant. Until now the most dangerous things it can do left no
-- durable trace:
--
--   * reset_user_password minted a live account-recovery link and recorded
--     nothing at all — no row, not even a console line.
--   * get_company_magic_link (impersonation of a tenant SUPERADMIN) wrote one
--     console.log, which log retention eventually drops.
--   * delete_company irreversibly deletes every auth user, project and record
--     belonging to a tenant, and then the tenant, leaving nothing behind to say
--     it happened.
--
-- So the question that matters after a token leak — what was done with it? —
-- was unanswerable. This table answers it.
--
-- Deliberately separate from audit_logs and billing_audit_logs: those are
-- tenant-scoped and written by triggers on tenant tables, and every one of
-- their rows has an actor_id that is a real user. A platform action has no
-- authenticated user at all — the actor is whoever holds the token — so it
-- needs its own shape, and mixing it into a tenant's audit trail would put
-- operator actions inside data a tenant can read.
--
-- Append-only by construction: no UPDATE or DELETE grant is issued to anyone,
-- so even the service role has to go out of its way to rewrite history.

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- RESET_USER_PASSWORD | COMPANY_MAGIC_LINK | DELETE_COMPANY |
  -- TOGGLE_COMPANY_STATUS | ... Free text rather than an enum: a new admin
  -- action should not need a migration to become auditable, and an enum whose
  -- values lag the code produces silent gaps.
  action      TEXT        NOT NULL,
  -- Target identifiers and any action-specific context. Never a secret: the
  -- generated recovery/magic link itself is deliberately NOT stored, since a
  -- log of live account-takeover links is worse than no log.
  details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Derived by clientIp() in _shared/rate_limit.ts, which prefers headers the
  -- caller cannot forge. Indicative, not proof.
  actor_ip    TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at
  ON public.platform_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action
  ON public.platform_audit_logs (action, created_at DESC);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- No policies, and no grants to anon/authenticated: service-role only, the same
-- shape as leads, billing_events, email_log and rate_limits. A tenant must
-- never be able to read operator activity, including its own.
REVOKE ALL ON TABLE public.platform_audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.platform_audit_logs TO service_role;
