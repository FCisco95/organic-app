-- Easter Egg Hunt system: stealth golden eggs with admin controls
-- Three tables: config (single-row admin settings), golden_eggs (discoveries), egg_hunt_luck (per-user luck tracking)

-- 1. Admin config (single-row)
CREATE TABLE IF NOT EXISTS public.egg_hunt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shimmer_enabled BOOLEAN DEFAULT false,
  shimmer_rate DECIMAL(5,4) DEFAULT 0.03,
  hunt_enabled BOOLEAN DEFAULT false,
  base_spawn_rate DECIMAL(5,4) DEFAULT 0.001,
  probability_override BOOLEAN DEFAULT false,
  override_rate DECIMAL(5,4) DEFAULT 0.005,
  override_expires_at TIMESTAMPTZ,
  campaign_revealed BOOLEAN DEFAULT false,
  hunt_ends_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.user_profiles(id)
);

-- Insert default config row
INSERT INTO public.egg_hunt_config (shimmer_enabled, hunt_enabled)
VALUES (false, false);

-- 2. Golden eggs (user discoveries)
CREATE TABLE IF NOT EXISTS public.golden_eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  egg_number INT NOT NULL CHECK (egg_number BETWEEN 1 AND 10),
  element TEXT NOT NULL,
  found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  found_on_page TEXT NOT NULL,
  shared_to_x BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  UNIQUE(user_id, egg_number)
);

CREATE INDEX IF NOT EXISTS idx_golden_eggs_user ON public.golden_eggs(user_id);
CREATE INDEX IF NOT EXISTS idx_golden_eggs_element ON public.golden_eggs(element);

-- 3. Luck tracking (per-user)
CREATE TABLE IF NOT EXISTS public.egg_hunt_luck (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id),
  page_loads_since_last_find INT DEFAULT 0,
  luck_boost DECIMAL(5,4) DEFAULT 0,
  luck_boost_expires_at TIMESTAMPTZ,
  last_calculated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies

-- egg_hunt_config: anyone authenticated can read, only admins can modify
ALTER TABLE public.egg_hunt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egg_hunt_config_select_authenticated"
  ON public.egg_hunt_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "egg_hunt_config_update_admin"
  ON public.egg_hunt_config FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- golden_eggs: users can read their own, admins can read all, inserts via server only
ALTER TABLE public.golden_eggs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "golden_eggs_select_own"
  ON public.golden_eggs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "golden_eggs_select_admin"
  ON public.golden_eggs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "golden_eggs_insert_authenticated"
  ON public.golden_eggs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- egg_hunt_luck: users can read/update their own
ALTER TABLE public.egg_hunt_luck ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egg_hunt_luck_select_own"
  ON public.egg_hunt_luck FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "egg_hunt_luck_upsert_own"
  ON public.egg_hunt_luck FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "egg_hunt_luck_update_own"
  ON public.egg_hunt_luck FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
