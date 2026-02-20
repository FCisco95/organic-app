-- Proposal lifecycle stage engine: forward-only lifecycle, immutable versions, and append-only stage events.

-- 1) Extend proposal status enum with lifecycle states.
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'public';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'qualified';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'discussion';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'finalized';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'canceled';

-- 2) Add lifecycle metadata columns.
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS current_version_id UUID,
ADD COLUMN IF NOT EXISTS current_version_number INTEGER,
ADD COLUMN IF NOT EXISTS qualification_locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS upvotes_frozen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qualification_override_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qualification_override_reason TEXT,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS proposal_version_id UUID;

UPDATE public.proposals
SET current_version_number = 1
WHERE current_version_number IS NULL;

ALTER TABLE public.proposals
ALTER COLUMN current_version_number SET DEFAULT 1;

ALTER TABLE public.proposals
ALTER COLUMN current_version_number SET NOT NULL;

-- 3) Create immutable proposal versions table.
CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category proposal_category,
  summary TEXT,
  motivation TEXT,
  solution TEXT,
  budget TEXT,
  timeline TEXT,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proposal_versions_unique_per_proposal UNIQUE (proposal_id, version_number),
  CONSTRAINT proposal_versions_proposal_fk
    FOREIGN KEY (proposal_id)
    REFERENCES public.proposals(id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
);

-- 4) Create append-only stage events table.
CREATE TABLE IF NOT EXISTS public.proposal_stage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  from_status proposal_status,
  to_status proposal_status NOT NULL,
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Add missing FKs once both tables exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_current_version_id_fkey'
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_current_version_id_fkey
      FOREIGN KEY (current_version_id)
      REFERENCES public.proposal_versions(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comments_proposal_version_id_fkey'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_proposal_version_id_fkey
      FOREIGN KEY (proposal_version_id)
      REFERENCES public.proposal_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 6) Indexes for lifecycle and version lookups.
CREATE INDEX IF NOT EXISTS idx_proposals_current_version_id
  ON public.proposals(current_version_id);

CREATE INDEX IF NOT EXISTS idx_proposals_override_expiry
  ON public.proposals(qualification_override_expires_at)
  WHERE qualification_override_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_version
  ON public.proposal_versions(proposal_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_stage_events_proposal_created
  ON public.proposal_stage_events(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_proposal_version
  ON public.comments(subject_id, proposal_version_id)
  WHERE subject_type = 'proposal';

-- 7) Utility functions.
CREATE OR REPLACE FUNCTION public.normalize_proposal_status(p_status proposal_status)
RETURNS proposal_status
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'submitted' THEN 'public'::proposal_status
    WHEN 'approved' THEN 'finalized'::proposal_status
    WHEN 'rejected' THEN 'finalized'::proposal_status
    ELSE p_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.proposal_status_rank(p_status proposal_status)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE public.normalize_proposal_status(p_status)
    WHEN 'draft' THEN 1
    WHEN 'public' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'discussion' THEN 4
    WHEN 'voting' THEN 5
    WHEN 'finalized' THEN 6
    WHEN 'canceled' THEN 7
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_proposal_versions_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'proposal_versions is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_proposal_stage_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'proposal_stage_events is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_initial_proposal_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_version_id UUID;
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := uuid_generate_v4();
  END IF;

  INSERT INTO public.proposal_versions (
    proposal_id,
    version_number,
    title,
    body,
    category,
    summary,
    motivation,
    solution,
    budget,
    timeline,
    created_by
  )
  VALUES (
    NEW.id,
    1,
    NEW.title,
    NEW.body,
    NEW.category,
    NEW.summary,
    NEW.motivation,
    NEW.solution,
    NEW.budget,
    NEW.timeline,
    COALESCE(auth.uid(), NEW.created_by)
  )
  RETURNING id INTO v_version_id;

  NEW.current_version_id := v_version_id;
  NEW.current_version_number := 1;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_proposal_stage_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status proposal_status;
  v_new_status proposal_status;
BEGIN
  v_old_status := public.normalize_proposal_status(COALESCE(OLD.status, 'draft'::proposal_status));
  v_new_status := public.normalize_proposal_status(COALESCE(NEW.status, 'draft'::proposal_status));

  IF (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.summary IS DISTINCT FROM OLD.summary
    OR NEW.motivation IS DISTINCT FROM OLD.motivation
    OR NEW.solution IS DISTINCT FROM OLD.solution
    OR NEW.budget IS DISTINCT FROM OLD.budget
    OR NEW.timeline IS DISTINCT FROM OLD.timeline
  ) AND v_old_status IN ('voting'::proposal_status, 'finalized'::proposal_status, 'canceled'::proposal_status) THEN
    RAISE EXCEPTION 'proposal content is locked once voting starts';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_old_status IN ('finalized'::proposal_status, 'canceled'::proposal_status) THEN
      RAISE EXCEPTION 'cannot transition from terminal status %', v_old_status;
    END IF;

    IF v_new_status = 'canceled'::proposal_status THEN
      NULL;
    ELSIF v_old_status = 'draft'::proposal_status AND v_new_status NOT IN ('public'::proposal_status) THEN
      RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
    ELSIF v_old_status = 'public'::proposal_status
      AND v_new_status NOT IN ('qualified'::proposal_status, 'discussion'::proposal_status, 'voting'::proposal_status) THEN
      RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
    ELSIF v_old_status = 'qualified'::proposal_status
      AND v_new_status NOT IN ('discussion'::proposal_status, 'voting'::proposal_status, 'public'::proposal_status) THEN
      RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
    ELSIF v_old_status = 'discussion'::proposal_status
      AND v_new_status NOT IN ('voting'::proposal_status, 'public'::proposal_status) THEN
      RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
    ELSIF v_old_status = 'voting'::proposal_status
      AND v_new_status NOT IN ('finalized'::proposal_status) THEN
      RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
    END IF;

    IF v_new_status = 'qualified'::proposal_status THEN
      NEW.qualification_locked_at := COALESCE(NEW.qualification_locked_at, NOW());
      NEW.upvotes_frozen_at := COALESCE(NEW.upvotes_frozen_at, NOW());
    END IF;

    IF v_new_status = 'public'::proposal_status
      AND v_old_status IN ('qualified'::proposal_status, 'discussion'::proposal_status) THEN
      IF OLD.qualification_override_expires_at IS NOT NULL
        AND OLD.qualification_override_expires_at > NOW() THEN
        RAISE EXCEPTION 'cannot revert override promotion before ttl expiry';
      END IF;
      NEW.qualification_locked_at := NULL;
      NEW.upvotes_frozen_at := NULL;
      NEW.qualification_override_expires_at := NULL;
      NEW.qualification_override_reason := NULL;
    END IF;

    IF v_new_status = 'finalized'::proposal_status THEN
      NEW.finalized_at := COALESCE(NEW.finalized_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_discussion_proposal_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_version INTEGER;
  v_version_id UUID;
BEGIN
  IF public.normalize_proposal_status(COALESCE(NEW.status, 'draft'::proposal_status)) = 'discussion'::proposal_status
    AND (
      NEW.title IS DISTINCT FROM OLD.title
      OR NEW.body IS DISTINCT FROM OLD.body
      OR NEW.category IS DISTINCT FROM OLD.category
      OR NEW.summary IS DISTINCT FROM OLD.summary
      OR NEW.motivation IS DISTINCT FROM OLD.motivation
      OR NEW.solution IS DISTINCT FROM OLD.solution
      OR NEW.budget IS DISTINCT FROM OLD.budget
      OR NEW.timeline IS DISTINCT FROM OLD.timeline
    ) THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.proposal_versions
    WHERE proposal_id = NEW.id;

    INSERT INTO public.proposal_versions (
      proposal_id,
      version_number,
      title,
      body,
      category,
      summary,
      motivation,
      solution,
      budget,
      timeline,
      created_by
    )
    VALUES (
      NEW.id,
      v_next_version,
      NEW.title,
      NEW.body,
      NEW.category,
      NEW.summary,
      NEW.motivation,
      NEW.solution,
      NEW.budget,
      NEW.timeline,
      COALESCE(auth.uid(), NEW.created_by)
    )
    RETURNING id INTO v_version_id;

    NEW.current_version_id := v_version_id;
    NEW.current_version_number := v_next_version;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_proposal_stage_event_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.proposal_stage_events (
    proposal_id,
    from_status,
    to_status,
    actor_id,
    reason,
    metadata
  )
  VALUES (
    NEW.id,
    NULL,
    NEW.status,
    auth.uid(),
    'proposal_created',
    jsonb_build_object('source', 'trigger')
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_proposal_stage_event_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.proposal_stage_events (
    proposal_id,
    from_status,
    to_status,
    actor_id,
    reason,
    metadata
  )
  VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    auth.uid(),
    NULL,
    jsonb_build_object(
      'source', 'trigger',
      'from_normalized', public.normalize_proposal_status(COALESCE(OLD.status, 'draft'::proposal_status)),
      'to_normalized', public.normalize_proposal_status(COALESCE(NEW.status, 'draft'::proposal_status))
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_proposal_override_promotions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH expired AS (
    SELECT id, status
    FROM public.proposals
    WHERE public.normalize_proposal_status(COALESCE(status, 'draft'::proposal_status))
      IN ('qualified'::proposal_status, 'discussion'::proposal_status)
      AND qualification_override_expires_at IS NOT NULL
      AND qualification_override_expires_at <= NOW()
      AND voting_starts_at IS NULL
  ),
  updated AS (
    UPDATE public.proposals p
    SET
      status = 'public',
      qualification_locked_at = NULL,
      upvotes_frozen_at = NULL,
      qualification_override_expires_at = NULL,
      qualification_override_reason = NULL,
      updated_at = NOW()
    FROM expired e
    WHERE p.id = e.id
    RETURNING p.id, e.status AS previous_status
  )
  INSERT INTO public.proposal_stage_events (
    proposal_id,
    from_status,
    to_status,
    actor_id,
    reason,
    metadata
  )
  SELECT
    u.id,
    u.previous_status,
    'public'::proposal_status,
    NULL,
    'override_ttl_expired',
    jsonb_build_object('source', 'expire_proposal_override_promotions')
  FROM updated u;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_proposal_override_promotions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_proposal_override_promotions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_proposal_override_promotions() TO service_role;

-- 8) Triggers.
DROP TRIGGER IF EXISTS trg_proposals_capture_initial_version ON public.proposals;
CREATE TRIGGER trg_proposals_capture_initial_version
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_initial_proposal_version();

DROP TRIGGER IF EXISTS trg_proposals_enforce_stage_rules ON public.proposals;
CREATE TRIGGER trg_proposals_enforce_stage_rules
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_proposal_stage_rules();

DROP TRIGGER IF EXISTS trg_proposals_capture_discussion_version ON public.proposals;
CREATE TRIGGER trg_proposals_capture_discussion_version
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_discussion_proposal_version();

DROP TRIGGER IF EXISTS trg_proposals_stage_event_insert ON public.proposals;
CREATE TRIGGER trg_proposals_stage_event_insert
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_proposal_stage_event_on_insert();

DROP TRIGGER IF EXISTS trg_proposals_stage_event_update ON public.proposals;
CREATE TRIGGER trg_proposals_stage_event_update
  AFTER UPDATE OF status ON public.proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_proposal_stage_event_on_update();

DROP TRIGGER IF EXISTS trg_proposal_versions_immutable_update ON public.proposal_versions;
CREATE TRIGGER trg_proposal_versions_immutable_update
  BEFORE UPDATE ON public.proposal_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_proposal_versions_mutation();

DROP TRIGGER IF EXISTS trg_proposal_versions_immutable_delete ON public.proposal_versions;
CREATE TRIGGER trg_proposal_versions_immutable_delete
  BEFORE DELETE ON public.proposal_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_proposal_versions_mutation();

DROP TRIGGER IF EXISTS trg_proposal_stage_events_append_only_update ON public.proposal_stage_events;
CREATE TRIGGER trg_proposal_stage_events_append_only_update
  BEFORE UPDATE ON public.proposal_stage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_proposal_stage_events_mutation();

DROP TRIGGER IF EXISTS trg_proposal_stage_events_append_only_delete ON public.proposal_stage_events;
CREATE TRIGGER trg_proposal_stage_events_append_only_delete
  BEFORE DELETE ON public.proposal_stage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_proposal_stage_events_mutation();

-- 9) Backfill versions and comment bindings.
INSERT INTO public.proposal_versions (
  proposal_id,
  version_number,
  title,
  body,
  category,
  summary,
  motivation,
  solution,
  budget,
  timeline,
  created_by,
  created_at
)
SELECT
  p.id,
  1,
  p.title,
  p.body,
  p.category,
  p.summary,
  p.motivation,
  p.solution,
  p.budget,
  p.timeline,
  p.created_by,
  COALESCE(p.created_at, NOW())
FROM public.proposals p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.proposal_versions pv
  WHERE pv.proposal_id = p.id
);

WITH latest_versions AS (
  SELECT DISTINCT ON (proposal_id)
    proposal_id,
    id,
    version_number
  FROM public.proposal_versions
  ORDER BY proposal_id, version_number DESC
)
UPDATE public.proposals p
SET
  current_version_id = lv.id,
  current_version_number = lv.version_number
FROM latest_versions lv
WHERE p.id = lv.proposal_id
  AND (p.current_version_id IS NULL OR p.current_version_number IS NULL);

UPDATE public.comments c
SET proposal_version_id = p.current_version_id
FROM public.proposals p
WHERE c.subject_type = 'proposal'
  AND c.subject_id = p.id
  AND c.proposal_version_id IS NULL;

-- 10) RLS for lifecycle tables.
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_stage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Proposal versions are viewable by everyone" ON public.proposal_versions;
CREATE POLICY "Proposal versions are viewable by everyone"
  ON public.proposal_versions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert proposal versions" ON public.proposal_versions;
CREATE POLICY "Authenticated users can insert proposal versions"
  ON public.proposal_versions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Proposal stage events are viewable by everyone" ON public.proposal_stage_events;
CREATE POLICY "Proposal stage events are viewable by everyone"
  ON public.proposal_stage_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert proposal stage events" ON public.proposal_stage_events;
CREATE POLICY "Authenticated users can insert proposal stage events"
  ON public.proposal_stage_events FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );
