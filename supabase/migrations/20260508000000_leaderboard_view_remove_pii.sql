-- CRIT-1 (Security audit 2026-05-08):
-- The leaderboard view is publicly readable (SELECT granted to anon for the
-- unauthenticated landing page). It MUST NOT expose PII (email) or internal
-- economic data (claimable_points). An earlier hardening migration removed
-- those columns; two recent feature migrations (20260507212349,
-- 20260507221350) accidentally re-introduced them when adding the
-- easter_2026_egg_elements column.
--
-- This migration drops the view + materialized view and recreates them with
-- the original safe column list (id, name, organic_id, avatar_url,
-- total_points, tasks_completed, role, xp_total, level, current_streak,
-- restriction_status, easter_2026_egg_elements + the rank windows). It
-- preserves the easter_2026_egg_elements column added by PR #114 / #115.

DROP MATERIALIZED VIEW IF EXISTS public.leaderboard_materialized;
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

CREATE VIEW public.leaderboard_view AS
SELECT
  id,
  name,
  organic_id,
  avatar_url,
  total_points,
  tasks_completed,
  role,
  xp_total,
  level,
  current_streak,
  restriction_status,
  easter_2026_egg_elements,
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

CREATE MATERIALIZED VIEW public.leaderboard_materialized AS
SELECT * FROM public.leaderboard_view;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_materialized_id
  ON public.leaderboard_materialized(id);

GRANT SELECT ON public.leaderboard_materialized TO authenticated;
GRANT SELECT ON public.leaderboard_materialized TO anon;
