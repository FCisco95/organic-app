-- ===========================================================================
-- Migration: RLS auth_rls_initplan Performance Fix — Supplement
-- Purpose:   Fix 8 additional bare auth.uid() policies found in live DB
--            that were not present in the migration file history.
--            These are duplicate/extra policies that will be consolidated
--            in Session 2, but must be performance-fixed now.
-- ===========================================================================

-- ─── tasks (live-only policies) ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Council and admin can update tasks" ON public.tasks;
CREATE POLICY "Council and admin can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- ─── reward_claims (live-only policies) ────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own claims" ON public.reward_claims;
CREATE POLICY "Users can read own claims"
  ON public.reward_claims FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Users can insert own claims" ON public.reward_claims;
CREATE POLICY "Users can insert own claims"
  ON public.reward_claims FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin can update claims" ON public.reward_claims;
CREATE POLICY "Admin can update claims"
  ON public.reward_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'admin'
    )
  );

-- ─── reward_distributions (live-only policies) ────────────────────────────
DROP POLICY IF EXISTS "Users can read own distributions" ON public.reward_distributions;
CREATE POLICY "Users can read own distributions"
  ON public.reward_distributions FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Admin can insert distributions" ON public.reward_distributions;
CREATE POLICY "Admin can insert distributions"
  ON public.reward_distributions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'admin'
    )
  );

-- ─── sprint_snapshots (live-only policy) ──────────────────────────────────
DROP POLICY IF EXISTS "Council can create sprint snapshots" ON public.sprint_snapshots;
CREATE POLICY "Council can create sprint snapshots"
  ON public.sprint_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('council', 'admin')
    )
  );
