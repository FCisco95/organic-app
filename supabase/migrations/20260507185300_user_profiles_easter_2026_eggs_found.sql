-- Denormalize Easter 2026 golden-egg find counts onto user_profiles so the
-- recipient badge can render publicly without relaxing golden_eggs RLS.
-- Source table public.golden_eggs is left untouched; the Easter 2026 archive
-- migration (PR #106) can run afterwards without affecting this column.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS easter_2026_eggs_found SMALLINT NOT NULL DEFAULT 0
    CHECK (easter_2026_eggs_found BETWEEN 0 AND 10);

UPDATE public.user_profiles up
   SET easter_2026_eggs_found = sub.found
  FROM (
    SELECT user_id, COUNT(*)::SMALLINT AS found
      FROM public.golden_eggs
     GROUP BY user_id
  ) sub
 WHERE sub.user_id = up.id
   AND up.easter_2026_eggs_found = 0;

CREATE INDEX IF NOT EXISTS idx_user_profiles_easter_2026_eggs_found
  ON public.user_profiles (easter_2026_eggs_found)
  WHERE easter_2026_eggs_found > 0;
