-- Task 3: Proposal-task linkage revamp
-- Adds immutable proposal provenance on tasks and enforces lifecycle gate.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS proposal_version_id UUID;

-- Ensure proposal versions can be referenced by (proposal_id, id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposal_versions_proposal_id_id_key'
  ) THEN
    ALTER TABLE public.proposal_versions
      ADD CONSTRAINT proposal_versions_proposal_id_id_key
      UNIQUE (proposal_id, id);
  END IF;
END $$;

-- Preserve proposal linkage by blocking proposal deletes that still have tasks.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_proposal_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      DROP CONSTRAINT tasks_proposal_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_proposal_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_proposal_id_fkey
      FOREIGN KEY (proposal_id)
      REFERENCES public.proposals(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_proposal_version_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_proposal_version_id_fkey
      FOREIGN KEY (proposal_version_id)
      REFERENCES public.proposal_versions(id)
      ON DELETE RESTRICT
      DEFERRABLE INITIALLY IMMEDIATE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_proposal_provenance_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_proposal_provenance_fkey
      FOREIGN KEY (proposal_id, proposal_version_id)
      REFERENCES public.proposal_versions(proposal_id, id)
      ON DELETE RESTRICT
      DEFERRABLE INITIALLY IMMEDIATE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_proposal_provenance_pair_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_proposal_provenance_pair_check
      CHECK (
        (proposal_id IS NULL AND proposal_version_id IS NULL)
        OR (proposal_id IS NOT NULL AND proposal_version_id IS NOT NULL)
      )
      NOT VALID;
  END IF;
END $$;

-- Backfill proposal version references for existing proposal-linked tasks.
UPDATE public.tasks t
SET proposal_version_id = p.current_version_id
FROM public.proposals p
WHERE t.proposal_id = p.id
  AND t.proposal_version_id IS NULL
  AND p.current_version_id IS NOT NULL;

UPDATE public.tasks t
SET proposal_version_id = pv.id
FROM (
  SELECT DISTINCT ON (proposal_id)
    proposal_id,
    id
  FROM public.proposal_versions
  ORDER BY proposal_id, version_number DESC
) pv
WHERE t.proposal_id = pv.proposal_id
  AND t.proposal_id IS NOT NULL
  AND t.proposal_version_id IS NULL;

-- Validate constraints once backfill reaches a consistent state.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE (proposal_id IS NULL) <> (proposal_version_id IS NULL)
    LIMIT 1
  ) THEN
    ALTER TABLE public.tasks
      VALIDATE CONSTRAINT tasks_proposal_provenance_pair_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.proposal_versions pv
      ON pv.id = t.proposal_version_id
    WHERE t.proposal_id IS NOT NULL
      AND (pv.id IS NULL OR pv.proposal_id <> t.proposal_id)
    LIMIT 1
  ) THEN
    ALTER TABLE public.tasks
      VALIDATE CONSTRAINT tasks_proposal_version_id_fkey;
    ALTER TABLE public.tasks
      VALIDATE CONSTRAINT tasks_proposal_provenance_fkey;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_proposal_version_id
  ON public.tasks(proposal_version_id)
  WHERE proposal_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_proposal_provenance
  ON public.tasks(proposal_id, proposal_version_id)
  WHERE proposal_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_task_proposal_provenance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status proposal_status;
  v_normalized_status proposal_status;
  v_result TEXT;
  v_current_version_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.proposal_id IS DISTINCT FROM NEW.proposal_id
      OR OLD.proposal_version_id IS DISTINCT FROM NEW.proposal_version_id THEN
      RAISE EXCEPTION 'task proposal provenance is immutable once set';
    END IF;

    IF NEW.proposal_id IS NULL AND NEW.proposal_version_id IS NOT NULL THEN
      RAISE EXCEPTION 'proposal_version_id cannot be set without proposal_id';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.proposal_id IS NULL THEN
    IF NEW.proposal_version_id IS NOT NULL THEN
      RAISE EXCEPTION 'proposal_version_id cannot be set without proposal_id';
    END IF;

    RETURN NEW;
  END IF;

  SELECT p.status, p.result, p.current_version_id
  INTO v_status, v_result, v_current_version_id
  FROM public.proposals p
  WHERE p.id = NEW.proposal_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal not found for task provenance';
  END IF;

  v_normalized_status := public.normalize_proposal_status(
    COALESCE(v_status, 'draft'::proposal_status)
  );

  IF NOT (
    v_normalized_status = 'finalized'::proposal_status
    AND (
      COALESCE(v_result, '') = 'passed'
      OR v_status = 'approved'::proposal_status
    )
  ) THEN
    RAISE EXCEPTION 'proposal-generated tasks require a finalized passed proposal';
  END IF;

  IF v_current_version_id IS NULL THEN
    RAISE EXCEPTION 'proposal current_version_id is required to create a proposal-linked task';
  END IF;

  IF NEW.proposal_version_id IS NULL THEN
    NEW.proposal_version_id := v_current_version_id;
  END IF;

  IF NEW.proposal_version_id <> v_current_version_id THEN
    RAISE EXCEPTION 'proposal-generated tasks must reference the proposal current version';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_enforce_proposal_provenance ON public.tasks;
CREATE TRIGGER trg_tasks_enforce_proposal_provenance
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_proposal_provenance();
