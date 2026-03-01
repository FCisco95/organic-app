-- ============================================================================
-- Migration: Phase 28 Ideas Incubator RLS
-- Purpose:   Enable and define RLS policies for Ideas Incubator tables.
-- Approval:  User explicitly approved RLS policy modifications on 2026-03-01.
-- ============================================================================

-- 1) Enable RLS on Phase 28 tables
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_promotion_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_events ENABLE ROW LEVEL SECURITY;

-- 2) ideas policies
DROP POLICY IF EXISTS "Ideas are viewable by everyone" ON public.ideas;
CREATE POLICY "Ideas are viewable by everyone"
  ON public.ideas FOR SELECT
  USING (
    removed_at IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Authenticated users with organic_id can create ideas" ON public.ideas;
CREATE POLICY "Authenticated users with organic_id can create ideas"
  ON public.ideas FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('member', 'council', 'admin')
        AND user_profiles.organic_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Authors can update own open ideas" ON public.ideas;
CREATE POLICY "Authors can update own open ideas"
  ON public.ideas FOR UPDATE
  USING (
    author_id = (SELECT auth.uid())
    AND status = 'open'
    AND removed_at IS NULL
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'open'
    AND removed_at IS NULL
  );

DROP POLICY IF EXISTS "Admins and council can moderate ideas" ON public.ideas;
CREATE POLICY "Admins and council can moderate ideas"
  ON public.ideas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- 3) idea_votes policies
DROP POLICY IF EXISTS "Users can view own idea votes" ON public.idea_votes;
CREATE POLICY "Users can view own idea votes"
  ON public.idea_votes FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins and council can view all idea votes" ON public.idea_votes;
CREATE POLICY "Admins and council can view all idea votes"
  ON public.idea_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Eligible users can create idea votes" ON public.idea_votes;
CREATE POLICY "Eligible users can create idea votes"
  ON public.idea_votes FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('member', 'council', 'admin')
        AND user_profiles.organic_id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.ideas
      WHERE ideas.id = idea_votes.idea_id
        AND ideas.removed_at IS NULL
        AND ideas.status = 'open'
        AND ideas.author_id <> (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own idea votes" ON public.idea_votes;
CREATE POLICY "Users can update own idea votes"
  ON public.idea_votes FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('member', 'council', 'admin')
        AND user_profiles.organic_id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.ideas
      WHERE ideas.id = idea_votes.idea_id
        AND ideas.removed_at IS NULL
        AND ideas.status = 'open'
        AND ideas.author_id <> (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own idea votes" ON public.idea_votes;
CREATE POLICY "Users can delete own idea votes"
  ON public.idea_votes FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- 4) idea_promotion_cycles policies
DROP POLICY IF EXISTS "Idea promotion cycles are viewable by everyone" ON public.idea_promotion_cycles;
CREATE POLICY "Idea promotion cycles are viewable by everyone"
  ON public.idea_promotion_cycles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and council can manage idea promotion cycles" ON public.idea_promotion_cycles;
CREATE POLICY "Admins and council can manage idea promotion cycles"
  ON public.idea_promotion_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

-- 5) idea_events policies
DROP POLICY IF EXISTS "Admins and council can view idea events" ON public.idea_events;
CREATE POLICY "Admins and council can view idea events"
  ON public.idea_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "Admins and council can create idea events" ON public.idea_events;
CREATE POLICY "Admins and council can create idea events"
  ON public.idea_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'council')
    )
  );
