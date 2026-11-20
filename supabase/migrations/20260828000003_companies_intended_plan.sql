-- =============================================================================
-- Migration: record which plan a self-serve signup came in for
-- =============================================================================
--
-- The pricing page sends non-custom plan CTAs to /start-trial?plan=<slug>, and
-- StartTrial.tsx read that slug only to print "You picked Professional" in the
-- subheading. It was never sent to the server, so the strongest intent signal a
-- self-serve signup carries — the price point they had already talked
-- themselves into — was discarded at the exact moment it was worth keeping.
--
-- Deliberately NOT companies.features: that JSONB is the per-tenant operational
-- kill-switch namespace read by has_feature(), and is a different thing from
-- both billing entitlements and sales metadata. Keeping them separate is why
-- CLAUDE.md calls out the two feature namespaces.
--
-- Deliberately not a foreign key to plans.slug either: it records what the
-- visitor clicked at signup time, which stays true even if that plan is later
-- renamed or deactivated. It grants nothing — entitlements come from
-- subscriptions/plans as before.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS intended_plan_slug TEXT;

COMMENT ON COLUMN public.companies.intended_plan_slug IS
  'Plan slug from the pricing-page CTA the self-serve signup arrived through. Sales signal only — grants no entitlement.';
