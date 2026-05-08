-- HIGH-3 (Security audit 2026-05-08):
-- The original golden_eggs INSERT policy let any authenticated user write
-- rows for themselves, bypassing the actual game discovery mechanism:
--
--   CREATE POLICY "golden_eggs_insert_authenticated"
--     ON public.golden_eggs FOR INSERT TO authenticated
--     WITH CHECK (user_id = auth.uid());
--
-- Every legitimate egg write goes through service_role (see
-- src/app/api/easter/egg-claim and egg-check), so this user-level INSERT
-- policy is unsafe AND unnecessary. The Easter 2026 campaign data was
-- archived in PR #106 but the table and policy remained.
--
-- Drop the policy. Service role retains full write access regardless of
-- RLS policies, so legitimate egg granting code is unaffected.

DROP POLICY IF EXISTS "golden_eggs_insert_authenticated" ON public.golden_eggs;
