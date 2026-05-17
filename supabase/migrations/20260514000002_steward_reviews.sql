-- 20260514000002_steward_reviews.sql
-- Sprint task D1: Steward review cache table.

-- 1) Trigram extension for duplicate detection (no-op if already present).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) task_steward_reviews
CREATE TABLE IF NOT EXISTS public.task_steward_reviews (
  task_id        uuid PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  summary        text NOT NULL,
  clarity_score  smallint NOT NULL,
  scope_score    smallint NOT NULL,
  concerns       jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text NOT NULL,
  generated_by   text NOT NULL,
  generated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tsr_clarity_check CHECK (clarity_score BETWEEN 1 AND 5),
  CONSTRAINT tsr_scope_check   CHECK (scope_score   BETWEEN 1 AND 5),
  CONSTRAINT tsr_recommendation_check CHECK (recommendation IN ('promote','flag','reject'))
);

-- 3) RLS — select to any authenticated user; writes service-role only.
ALTER TABLE public.task_steward_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "steward_reviews_select_authenticated" ON public.task_steward_reviews;
CREATE POLICY "steward_reviews_select_authenticated"
  ON public.task_steward_reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No INSERT/UPDATE/DELETE policies — only service role bypasses RLS.
