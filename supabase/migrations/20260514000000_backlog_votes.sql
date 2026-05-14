-- 20260514000000_backlog_votes.sql
-- Sprint task D1: member voting layer for backlog tasks (1p1v).

-- 1) Counter columns on tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS upvotes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvotes int NOT NULL DEFAULT 0;

-- Partial index for ranking backlog candidates by net score
CREATE INDEX IF NOT EXISTS idx_tasks_backlog_score
  ON public.tasks ((upvotes - downvotes) DESC, created_at ASC)
  WHERE status = 'backlog' AND sprint_id IS NULL;

-- 2) backlog_votes table
CREATE TABLE IF NOT EXISTS public.backlog_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  value      smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backlog_votes_value_check CHECK (value IN (-1, 1)),
  CONSTRAINT backlog_votes_unique UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_backlog_votes_task ON public.backlog_votes(task_id);
CREATE INDEX IF NOT EXISTS idx_backlog_votes_user ON public.backlog_votes(user_id);

-- 3) updated_at trigger (reuse helper from initial schema)
DROP TRIGGER IF EXISTS update_backlog_votes_updated_at ON public.backlog_votes;
CREATE TRIGGER update_backlog_votes_updated_at
  BEFORE UPDATE ON public.backlog_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Counter trigger — maintain tasks.upvotes / tasks.downvotes
CREATE OR REPLACE FUNCTION public.backlog_votes_maintain_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.value = 1 THEN
      UPDATE public.tasks SET upvotes = upvotes + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = downvotes + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.value = OLD.value THEN
      RETURN NEW;
    END IF;
    IF OLD.value = 1 THEN
      UPDATE public.tasks SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = NEW.task_id;
    END IF;
    IF NEW.value = 1 THEN
      UPDATE public.tasks SET upvotes = upvotes + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = downvotes + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.value = 1 THEN
      UPDATE public.tasks SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.task_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_backlog_votes_counters ON public.backlog_votes;
CREATE TRIGGER trg_backlog_votes_counters
  AFTER INSERT OR UPDATE OR DELETE ON public.backlog_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.backlog_votes_maintain_counters();

-- 5) RLS
ALTER TABLE public.backlog_votes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read votes (counter columns on tasks are the hot read path).
DROP POLICY IF EXISTS "backlog_votes_select_authenticated" ON public.backlog_votes;
CREATE POLICY "backlog_votes_select_authenticated"
  ON public.backlog_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only the row's own user_id can insert/update/delete.
DROP POLICY IF EXISTS "backlog_votes_insert_self" ON public.backlog_votes;
CREATE POLICY "backlog_votes_insert_self"
  ON public.backlog_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "backlog_votes_update_self" ON public.backlog_votes;
CREATE POLICY "backlog_votes_update_self"
  ON public.backlog_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "backlog_votes_delete_self" ON public.backlog_votes;
CREATE POLICY "backlog_votes_delete_self"
  ON public.backlog_votes FOR DELETE
  USING (auth.uid() = user_id);
