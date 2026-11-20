-- Restore the two hostname-bearing SQL functions to optimustesting.com.
--
-- 20260908000001 moved them to testflowhq.vercel.app when the domain was
-- briefly unavailable. The domain is back — wildcard A record on Vercel DNS,
-- Resend MX and DKIM intact — so the subdomain host model is restored:
--
--   optimustesting.com          marketing
--   app.optimustesting.com      tenant workspace (every company)
--   admin.optimustesting.com    platform admin
--   <slug>.optimustesting.com   branded company alias
--
-- That alias is why update_company_slug returns a per-slug URL again: on
-- *.vercel.app it could not, because Vercel issues flat names only.
--
-- The vercel.app reservation in request_custom_domain is deliberately KEPT
-- alongside the restored optimustesting.com one. Nothing about owning the
-- domain again makes it safe for a tenant to claim a hostname on a domain we
-- do not control, and testflowhq.vercel.app still resolves to this project.
--
-- Migrations are forward-only, so 20260908000001 stays as it is.

-- 1. Workspace URL after a slug change ---------------------------------------
CREATE OR REPLACE FUNCTION update_company_slug(_new_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := my_company_id();
  normalized TEXT := lower(trim(_new_slug));
  existing_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can rename the workspace';
  END IF;
  IF target_company IS NULL THEN
    RAISE EXCEPTION 'No company on file for this user';
  END IF;

  IF NOT (normalized ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR normalized ~ '^[a-z0-9]$') THEN
    RAISE EXCEPTION 'Workspace name must be lowercase alphanumeric with hyphens only';
  END IF;
  IF length(normalized) < 3 OR length(normalized) > 40 THEN
    RAISE EXCEPTION 'Workspace name must be between 3 and 40 characters';
  END IF;

  SELECT id INTO existing_id FROM companies WHERE slug = normalized;
  IF existing_id IS NOT NULL AND existing_id != target_company THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  UPDATE companies SET slug = normalized WHERE id = target_company;

  INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
  VALUES (auth.uid(), 'companies', target_company, 'SLUG_CHANGED', jsonb_build_object('new_slug', normalized));

  RETURN jsonb_build_object('slug', normalized, 'workspace_url', 'https://' || normalized || '.optimustesting.com');
END;
$$;

REVOKE ALL ON FUNCTION update_company_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_company_slug(TEXT) TO authenticated;

-- 2. Custom domain claim: CNAME target back to the app host ------------------
CREATE OR REPLACE FUNCTION request_custom_domain(_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := my_company_id();
  normalized TEXT := lower(trim(_domain));
  entitlements JSONB;
  existing_owner UUID;
  row_out company_domains;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can configure a custom domain';
  END IF;
  IF target_company IS NULL THEN
    RAISE EXCEPTION 'No company on file for this user';
  END IF;

  -- Premium gate. get_company_entitlements already folds in plan, trial,
  -- enterprise contract and add-on state, so this stays consistent with every
  -- other feature check rather than reading plan_features directly.
  entitlements := get_company_entitlements(target_company);
  IF COALESCE((entitlements -> 'features' ->> 'custom_domain')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION 'custom_domain_not_in_plan';
  END IF;

  -- Never let a tenant claim the platform's own hostnames. vercel.app stays
  -- reserved alongside our own domain: testflowhq.vercel.app still points at
  -- this project, and no tenant should be able to claim a hostname on a
  -- domain we do not control.
  IF normalized = 'optimustesting.com' OR normalized LIKE '%.optimustesting.com'
     OR normalized = 'vercel.app' OR normalized LIKE '%.vercel.app' THEN
    RAISE EXCEPTION 'Cannot claim a platform-owned domain';
  END IF;

  SELECT company_id INTO existing_owner FROM company_domains WHERE domain = normalized;
  IF existing_owner IS NOT NULL AND existing_owner != target_company THEN
    RAISE EXCEPTION 'domain_taken';
  END IF;

  INSERT INTO company_domains (company_id, domain)
  VALUES (target_company, normalized)
  ON CONFLICT (company_id) DO UPDATE
    -- Changing the domain invalidates any prior proof of control.
    SET domain = EXCLUDED.domain,
        verification_token = replace(gen_random_uuid()::TEXT, '-', '') || replace(gen_random_uuid()::TEXT, '-', ''),
        verified_at = NULL,
        provisioned_at = NULL
  RETURNING * INTO row_out;

  INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
  VALUES (auth.uid(), 'companies', target_company, 'CUSTOM_DOMAIN_REQUESTED',
          jsonb_build_object('domain', normalized));

  RETURN jsonb_build_object(
    'domain', row_out.domain,
    'verification_token', row_out.verification_token,
    'txt_record_name', '_testflow-verify.' || row_out.domain,
    'cname_target', 'app.optimustesting.com',
    'verified', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION request_custom_domain(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_custom_domain(TEXT) TO authenticated;
