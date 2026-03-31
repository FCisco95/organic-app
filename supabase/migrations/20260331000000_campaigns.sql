-- Campaign carousel system: admin-managed campaigns displayed on the dashboard
-- Supports visibility conditions for features like the egg hunt reveal

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  banner_url TEXT,
  icon TEXT,
  cta_text TEXT DEFAULT 'Learn more',
  cta_link TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'members', 'new_users', 'admins')),
  visibility_condition TEXT DEFAULT 'always' CHECK (visibility_condition IN ('always', 'egg_hunt_revealed')),
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.campaigns(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority ON public.campaigns(priority DESC, created_at DESC);

-- RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active campaigns
CREATE POLICY "campaigns_select_authenticated"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "campaigns_insert_admin"
  ON public.campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "campaigns_update_admin"
  ON public.campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "campaigns_delete_admin"
  ON public.campaigns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
