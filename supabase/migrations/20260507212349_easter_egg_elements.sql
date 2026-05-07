-- Replace easter_2026_eggs_found (count) with easter_2026_egg_elements (array)
-- so the recipient badge can render the *specific* eggs each user found
-- (cosmic, water, fire, ...) instead of a single generic icon.
--
-- Source of truth is archive.golden_eggs_2026 (created by PR #106's archive
-- migration earlier in the timestamp sequence). The original public.golden_eggs
-- table has been truncated.
--
-- Leaderboard views are recreated WITHOUT either egg column — the rank
-- symbols stay; eggs are not displayed on the leaderboard.

BEGIN;

-- 1. Add new array column ----------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS easter_2026_egg_elements TEXT[] NOT NULL DEFAULT '{}';

-- 2. Backfill from the archive ----------------------------------------------
UPDATE public.user_profiles up
   SET easter_2026_egg_elements = sub.elements
  FROM (
    SELECT
      user_id,
      array_agg(element ORDER BY egg_number) AS elements
    FROM archive.golden_eggs_2026
    GROUP BY user_id
  ) sub
 WHERE up.id = sub.user_id
   AND cardinality(up.easter_2026_egg_elements) = 0;

-- 3. Drop the obsolete count column + its partial index ---------------------
DROP INDEX IF EXISTS public.idx_user_profiles_easter_2026_eggs_found;

-- Drop materialized + view first since they reference the column.
DROP MATERIALIZED VIEW IF EXISTS public.leaderboard_materialized;
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS easter_2026_eggs_found;

-- 4. Recreate leaderboard views without any easter_* column -----------------
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

COMMIT;
