-- =============================================================================
-- Migration: RLS on rate_limits, and restore the hardened cross-tenant guard on
-- two functions that regressed to the two-clause form
-- =============================================================================
--
-- Three findings from the 2026-08-28 security audit, all of the same shape:
-- something that was supposed to be behind the RLS boundary is reachable from
-- the anon/authenticated key.
--
-- ── 1. rate_limits had no RLS at all ──────────────────────────────────────
--
-- 20260519000003_ratelimit_trial_billing.sql created the table and never
-- enabled RLS. It is the only table in the schema without it. Supabase's
-- default privileges give anon and authenticated full DML on public-schema
-- tables and PostgREST exposes it (it appears in the generated types with an
-- Insert and an Update shape), so the anon key that ships in the browser
-- bundle -- safe precisely because "RLS is the security boundary", per
-- CLAUDE.md gotcha 17 -- could read and write it directly.
--
-- That matters because rate_limits backs every rate limit in the system:
--
--   * DELETE FROM rate_limits wipes every bucket, defeating the rate limiting
--     on start-trial (the primary abuse control on unauthenticated company
--     creation), on generate-report (which spends Anthropic API money), and on
--     platform-admin-data (300/hr -- the brute-force guard in front of the
--     RLS-bypassing platform token).
--   * SELECT * discloses every bucket_key, and bucket keys embed user UUIDs
--     and client IP addresses by construction (`create-user:${caller.id}|ip:…`).
--     That is an anonymous read of PII.
--   * INSERT of a row with a large count for a chosen bucket_key locks a
--     specific SUPERADMIN out of create-user, or a specific company out of the
--     demo form -- a targeted denial of service with no credentials.
--
-- No policies are created. rate_limit_check() / rate_limit_gc() are SECURITY
-- DEFINER and run as the owner, so RLS does not apply to them; this is the
-- same service-role-only, no-policy shape already used by leads,
-- billing_events and email_log.
--
-- ── 2 & 3. Regressed tenant guards ────────────────────────────────────────
--
-- 20260813000019_final_review_fixes.sql hardened a guard it labelled "CRITICAL
-- for writes, leak for reads". The two-clause form
--
--     IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
--
-- evaluates to NULL -- not TRUE -- whenever my_company_id() is NULL, so the
-- RAISE never fires and the caller may pass any company's UUID. my_company_id()
-- returns NULL for a deactivated user or a suspended company (gotcha 18), and
-- company UUIDs are trivially enumerable because the companies SELECT policy is
-- USING (TRUE). The hardened form makes the NULL case explicit:
--
--     IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
--        AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
--
-- Two later migrations did CREATE OR REPLACE on functions covered by that fix
-- and reinstated the weak form, silently reverting it:
--
--   * request_subscription_cancellation -- 20260822000007. Writes
--     subscriptions.cancel_at, so this is a cross-tenant WRITE. The RPC has no
--     caller left after the prepaid cutover, but CREATE OR REPLACE preserved
--     the GRANT EXECUTE TO authenticated, so the endpoint is still live and an
--     attacker is now its only user. Kept rather than dropped: replacing the
--     guard closes the hole without betting that nothing unbuilt calls it.
--   * can_create_project -- 20260827000004. Read-only, but it is called by the
--     projects INSERT policy and pre-flighted from the UI, so it is very much
--     live, and it leaks another tenant's remaining project capacity.
--
-- Both bodies below are verbatim from the migration that last defined them,
-- with only the guard replaced.

-- ── 1. rate_limits ────────────────────────────────────────────────────────
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

-- ── 2. request_subscription_cancellation ──────────────────────────────────
CREATE OR REPLACE FUNCTION request_subscription_cancellation(_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  caller UUID := auth.uid();
  period_end TIMESTAMPTZ;
  persisted_cancel_at TIMESTAMPTZ;
BEGIN
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to manage subscription for this company';
  END IF;

  IF target_company IS NULL THEN
    RAISE EXCEPTION 'No company context';
  END IF;

  IF NOT (has_role(caller, 'GM') OR has_role(caller, 'SUPERADMIN')) THEN
    RAISE EXCEPTION 'Only GM or SUPERADMIN can cancel the subscription';
  END IF;

  SELECT current_period_end INTO period_end
    FROM subscriptions WHERE company_id = target_company;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for this company';
  END IF;

  UPDATE subscriptions
    SET cancel_at = COALESCE(cancel_at, period_end),
        updated_at = NOW()
    WHERE company_id = target_company
    RETURNING cancel_at INTO persisted_cancel_at;

  RETURN jsonb_build_object('cancelled_at_period_end', TRUE, 'cancel_at', persisted_cancel_at);
END;
$$;

-- ── 3. can_create_project ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_create_project(_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  entitlements JSONB;
  max_projects INT;
  current_projects INT;
BEGIN
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to check entitlements for this company';
  END IF;

  IF target_company IS NULL THEN RETURN FALSE; END IF;

  -- Prepaid model: an unrenewed workspace is read-only.
  IF is_workspace_frozen(target_company) THEN RETURN FALSE; END IF;

  entitlements := get_company_entitlements(target_company);
  max_projects := (entitlements->>'max_active_projects')::INT;
  IF max_projects IS NULL THEN RETURN TRUE; END IF; -- unlimited

  SELECT COUNT(*) INTO current_projects
  FROM projects
  WHERE company_id = target_company
    AND status != 'CLOSED'
    AND deleted_at IS NULL;

  RETURN current_projects < max_projects;
END;
$$;

-- CREATE OR REPLACE preserves existing grants, but re-assert them so this file
-- is self-contained if replayed from scratch. Note gotcha 20: an unchanged
-- parameter list means no new overload is created, so the historical REVOKEs
-- still apply to these exact signatures.
GRANT EXECUTE ON FUNCTION can_create_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_subscription_cancellation(UUID) TO authenticated;
