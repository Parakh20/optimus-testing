-- =============================================================================
-- Migration: close the public write path on demo_requests
-- =============================================================================
--
-- 20260523000001_demo_requests.sql created the table with:
--
--   create policy "anon_insert_demo_request"
--     on public.demo_requests for insert to anon with check (true);
--
-- That is an unauthenticated, unrate-limited, unbounded public write endpoint.
-- Anyone who reads the anon key out of the browser bundle (it is public by
-- design) can insert rows in a loop, with no honeypot or CAPTCHA in the way,
-- and each insert used to be paired with a client-side call to
-- notify-demo-request -- so the same loop also pushed mail through Resend on an
-- API key shared with notify-rework, start-trial and notify-renewal. An AUP
-- strike or quota exhaustion there stops rework notices reaching engineers.
--
-- The Edge Function now does the insert itself with the service-role key, after
-- its existing 30/hr/IP rate limit and honeypot check, so the client no longer
-- needs this policy.
--
-- DEPLOY ORDER: this migration must not land before the updated
-- notify-demo-request function and the updated frontend. CI runs migrations
-- first and gates function deploys behind the billing test job, so if that job
-- is red the demo form breaks while migrations proceed. If you are pushing on a
-- day when CI is unhealthy, hold this file back one commit — the fix above is
-- already complete without it; this only removes the leftover way in.

DROP POLICY IF EXISTS "anon_insert_demo_request" ON public.demo_requests;

REVOKE ALL ON TABLE public.demo_requests FROM anon, authenticated;
GRANT ALL ON TABLE public.demo_requests TO service_role;

-- The table already had RLS enabled and no SELECT policy, so it stays
-- service-role-only for reads too — the same shape as leads and email_log.
-- The read surface is get_demo_requests in platform-admin-data.
