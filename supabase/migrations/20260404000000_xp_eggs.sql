-- XP Egg spawns: config columns + pending claim tokens
-- Part of the Easter XP egg mechanic (random XP rewards on page navigation)

-- Add XP egg controls to existing egg_hunt_config
ALTER TABLE public.egg_hunt_config
  ADD COLUMN IF NOT EXISTS xp_egg_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xp_egg_spawn_rate DECIMAL(5,4) NOT NULL DEFAULT 0.04;

-- Pending XP egg claim tokens (short-lived, one-time-use)
CREATE TABLE IF NOT EXISTS public.xp_egg_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  is_shiny BOOLEAN NOT NULL DEFAULT false,
  egg_number INT,
  element TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_egg_pending_user
  ON public.xp_egg_pending(user_id, created_at);

-- RLS
ALTER TABLE public.xp_egg_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_egg_pending_select_own"
  ON public.xp_egg_pending FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "xp_egg_pending_delete_own"
  ON public.xp_egg_pending FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Service role needs insert (from egg-check API) and full access
-- Authenticated users only read/delete their own rows via RLS above
