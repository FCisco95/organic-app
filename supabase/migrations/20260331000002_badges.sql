-- Badge system: user_badges and wallet_snapshots for sprint badge tracking

-- user_badges: stores earned badges (permanent and sprint)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('permanent', 'sprint')),
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Unique constraint for sprint badges (sprint_id NOT NULL)
CREATE UNIQUE INDEX idx_user_badges_sprint_unique
  ON public.user_badges (user_id, badge_key, sprint_id)
  WHERE sprint_id IS NOT NULL;

-- Unique constraint for permanent badges (sprint_id IS NULL)
CREATE UNIQUE INDEX idx_user_badges_permanent_unique
  ON public.user_badges (user_id, badge_key)
  WHERE sprint_id IS NULL;

-- Query indexes
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_badges_type ON public.user_badges(badge_type, badge_key);

-- wallet_snapshots: ORG balance at sprint start/end for buyer trait
CREATE TABLE IF NOT EXISTS public.wallet_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  balance_start BIGINT NOT NULL,
  balance_end BIGINT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sprint_id)
);

CREATE INDEX idx_wallet_snapshots_sprint ON public.wallet_snapshots(sprint_id, user_id);

-- RLS: user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges
CREATE POLICY "user_badges_select_own"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all badges
CREATE POLICY "user_badges_select_admin"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserts via server only (service role bypasses RLS)
-- No INSERT policy for authenticated users

-- RLS: wallet_snapshots
ALTER TABLE public.wallet_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots
CREATE POLICY "wallet_snapshots_select_own"
  ON public.wallet_snapshots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all snapshots
CREATE POLICY "wallet_snapshots_select_admin"
  ON public.wallet_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
