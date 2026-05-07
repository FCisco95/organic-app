-- Defensive re-backfill for user_profiles.easter_2026_eggs_found.
--
-- Migration ordering quirk:
--   20260507161857  archives + truncates public.golden_eggs       (PR #106)
--   20260507185300  backfills from public.golden_eggs              (PR #112)
--   20260507185400  refreshes leaderboard views                    (PR #112)
--
-- On the production main DB the migrations were applied incrementally
-- (PR #112 first, then PR #106), so the backfill ran while
-- public.golden_eggs still held live data. Result: counts are correct.
--
-- For any *fresh* replay (preview, dev reset, restored snapshot) the
-- migrations apply in timestamp order, so the truncate runs before the
-- backfill and counts end up at 0.
--
-- This migration patches that path by re-backfilling from
-- archive.golden_eggs_2026, which is populated by 20260507161857
-- before the truncate. Idempotent: only writes rows where the existing
-- value is still 0, so it is a no-op on environments where the prior
-- backfill already succeeded.

UPDATE public.user_profiles up
   SET easter_2026_eggs_found = sub.found
  FROM (
    SELECT user_id, COUNT(*)::SMALLINT AS found
      FROM archive.golden_eggs_2026
     GROUP BY user_id
  ) sub
 WHERE sub.user_id = up.id
   AND up.easter_2026_eggs_found = 0;

-- Refresh the materialized leaderboard so the badge surfaces immediately
-- in environments where this fix-forward actually populated values.
REFRESH MATERIALIZED VIEW public.leaderboard_materialized;
