-- Egg opening mini-game: tracks XP-to-reward conversions (XP sink mechanic)

CREATE TABLE IF NOT EXISTS public.egg_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  xp_spent INT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for daily limit checks and history queries
CREATE INDEX IF NOT EXISTS idx_egg_opens_user_opened
  ON public.egg_opens(user_id, opened_at DESC);

-- RLS
ALTER TABLE public.egg_opens ENABLE ROW LEVEL SECURITY;

-- Users can read their own egg opens
CREATE POLICY "egg_opens_select_own"
  ON public.egg_opens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Inserts via server only (service role or RLS bypass)
-- No insert policy for authenticated users — server handles inserts
