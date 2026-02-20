-- ============================================================================
-- Migration: XP-first leaderboard posture
-- Purpose:
--   - Rank public leaderboard by XP as primary metric
--   - Use points and tasks as deterministic tie-breakers
--   - Refresh materialized leaderboard cache when present
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
ORDER BY
  COALESCE(xp_total, 0) DESC,
  COALESCE(total_points, 0) DESC,
  COALESCE(tasks_completed, 0) DESC,
  id ASC;

GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'leaderboard_materialized'
  ) THEN
    REFRESH MATERIALIZED VIEW public.leaderboard_materialized;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping leaderboard_materialized refresh: %', SQLERRM;
END $$;
