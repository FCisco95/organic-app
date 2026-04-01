-- Daily engagement tasks: track user progress on daily/weekly tasks with XP/point rewards
-- Includes login streak tracking for streak-based rewards

-- ─── daily_task_progress ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  task_key TEXT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  target INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_awarded INT NOT NULL DEFAULT 0,
  points_awarded INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, task_key, date)
);

-- Indexes for fast lookups by user + date
CREATE INDEX IF NOT EXISTS idx_daily_task_progress_user_date
  ON public.daily_task_progress(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_task_progress_date
  ON public.daily_task_progress(date);

-- RLS
ALTER TABLE public.daily_task_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "daily_task_progress_select_own"
  ON public.daily_task_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own progress
CREATE POLICY "daily_task_progress_insert_own"
  ON public.daily_task_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "daily_task_progress_update_own"
  ON public.daily_task_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all progress
CREATE POLICY "daily_task_progress_select_admin"
  ON public.daily_task_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── login_streaks ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.login_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id),
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_login_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

-- Users can read their own streak
CREATE POLICY "login_streaks_select_own"
  ON public.login_streaks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own streak
CREATE POLICY "login_streaks_insert_own"
  ON public.login_streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own streak
CREATE POLICY "login_streaks_update_own"
  ON public.login_streaks
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all streaks
CREATE POLICY "login_streaks_select_admin"
  ON public.login_streaks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
