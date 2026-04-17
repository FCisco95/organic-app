-- ===========================================================================
-- Migration: Sprint snapshots table (catch-up)
-- Purpose: Create `sprint_snapshots` referenced by rewards_distribution and
--          the RLS supplement migration. Prod created this table out-of-band
--          (likely via the Supabase dashboard); fresh Supabase instances need
--          it applied via migration so subsequent DROP POLICY and rewards
--          function references resolve.
-- Schema source of truth: src/types/database.ts#sprint_snapshots
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.sprint_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL UNIQUE REFERENCES public.sprints(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_points INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  incomplete_action TEXT,
  incomplete_tasks INTEGER NOT NULL DEFAULT 0,
  task_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_sprint_id
  ON public.sprint_snapshots(sprint_id);

CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_created_at
  ON public.sprint_snapshots(created_at DESC);

ALTER TABLE public.sprint_snapshots ENABLE ROW LEVEL SECURITY;

-- Baseline SELECT policy — members and above can read. Council/admin gets an
-- explicit INSERT policy from 20260219000001_rls_perf_fix_initplan_supplement.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sprint_snapshots'
      AND policyname = 'Authenticated users can read sprint snapshots'
  ) THEN
    CREATE POLICY "Authenticated users can read sprint snapshots"
      ON public.sprint_snapshots FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
