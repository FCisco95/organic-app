-- ============================================================================
-- Migration: Exclude restricted/banned users from leaderboard
-- Purpose:
--   - Add restriction_status to leaderboard_view
--   - Filter out restricted/banned users from rankings
--   - Refresh materialized view
-- ============================================================================

CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT
  id,
  name,
  email,
  organic_id,
  avatar_url,
  total_points,
  claimable_points,
  tasks_completed,
  role,
  xp_total,
  level,
  current_streak,
  restriction_status,
  RANK() OVER (
    ORDER BY
      COALESCE(xp_total, 0) DESC,
      COALESCE(total_points, 0) DESC,
      COALESCE(tasks_completed, 0) DESC,
      id ASC
  ) AS rank,
  DENSE_RANK() OVER (
    ORDER BY
      COALESCE(xp_total, 0) DESC,
      COALESCE(total_points, 0) DESC,
      COALESCE(tasks_completed, 0) DESC,
      id ASC
  ) AS dense_rank
FROM public.user_profiles
WHERE organic_id IS NOT NULL
  AND restriction_status NOT IN ('restricted', 'banned')
ORDER BY
  COALESCE(xp_total, 0) DESC,
  COALESCE(total_points, 0) DESC,
  COALESCE(tasks_completed, 0) DESC,
  id ASC;

GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- Recreate materialized view to include restriction_status and filter
DROP MATERIALIZED VIEW IF EXISTS public.leaderboard_materialized;

CREATE MATERIALIZED VIEW public.leaderboard_materialized AS
SELECT * FROM public.leaderboard_view;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_materialized_id
  ON public.leaderboard_materialized(id);

GRANT SELECT ON public.leaderboard_materialized TO authenticated;
GRANT SELECT ON public.leaderboard_materialized TO anon;
