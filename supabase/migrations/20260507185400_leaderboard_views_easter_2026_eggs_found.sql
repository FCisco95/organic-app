-- Refresh leaderboard_view and leaderboard_materialized to include the new
-- easter_2026_eggs_found column from user_profiles, so the egg-recipient
-- badge can render on leaderboard rows.
--
-- Pattern follows 20260409100000_leaderboard_exclude_restricted.sql:
-- DROP MATERIALIZED VIEW first (it depends on the view), then DROP VIEW
-- CASCADE, then recreate both. The full SELECT body is duplicated here
-- so the column ordering is explicit and reviewable.

DROP MATERIALIZED VIEW IF EXISTS public.leaderboard_materialized;
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

CREATE VIEW public.leaderboard_view AS
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
  easter_2026_eggs_found,
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
