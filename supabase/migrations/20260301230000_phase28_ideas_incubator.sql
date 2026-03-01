-- Phase 28: Ideas incubator core schema

-- 1) Core tables
CREATE TABLE IF NOT EXISTS public.ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'open',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_at TIMESTAMPTZ NULL,
  locked_at TIMESTAMPTZ NULL,
  removed_at TIMESTAMPTZ NULL,
  removed_reason TEXT NULL,
  promoted_to_proposal_id UUID NULL REFERENCES public.proposals(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ NULL,
  promotion_cycle_start DATE NULL,
  score INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ideas_status_check CHECK (status IN ('open', 'locked', 'archived', 'promoted', 'removed')),
  CONSTRAINT ideas_title_len_check CHECK (char_length(trim(title)) >= 5 AND char_length(title) <= 200),
  CONSTRAINT ideas_body_len_check CHECK (char_length(trim(body)) >= 20 AND char_length(body) <= 10000)
);

CREATE TABLE IF NOT EXISTS public.idea_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idea_votes_value_check CHECK (value IN (-1, 1)),
  CONSTRAINT idea_votes_unique UNIQUE (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.idea_promotion_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  winner_idea_id UUID NULL REFERENCES public.ideas(id) ON DELETE SET NULL,
  winner_selected_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  winner_selected_at TIMESTAMPTZ NULL,
  promoted_proposal_id UUID NULL REFERENCES public.proposals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idea_promotion_cycles_status_check CHECK (status IN ('open', 'selected', 'promoted', 'closed')),
  CONSTRAINT idea_promotion_cycles_date_check CHECK (cycle_end > cycle_start)
);

CREATE TABLE IF NOT EXISTS public.idea_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Proposal linkage
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS source_idea_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_source_idea_id_fkey'
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_source_idea_id_fkey
      FOREIGN KEY (source_idea_id)
      REFERENCES public.ideas(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- 3) Indexes for feed/ranking
CREATE INDEX IF NOT EXISTS idx_ideas_feed_hot
  ON public.ideas (is_pinned DESC, score DESC, last_activity_at DESC)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_feed_new
  ON public.ideas (is_pinned DESC, created_at DESC)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_cycle_status
  ON public.ideas (promotion_cycle_start, status);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_updated
  ON public.idea_votes (idea_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_idea_events_idea_created
  ON public.idea_events (idea_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_promotion_cycles_cycle_start
  ON public.idea_promotion_cycles (cycle_start);

CREATE INDEX IF NOT EXISTS idx_proposals_source_idea_id
  ON public.proposals (source_idea_id)
  WHERE source_idea_id IS NOT NULL;

-- 4) Updated-at triggers
DROP TRIGGER IF EXISTS update_ideas_updated_at ON public.ideas;
CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_idea_votes_updated_at ON public.idea_votes;
CREATE TRIGGER update_idea_votes_updated_at
  BEFORE UPDATE ON public.idea_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_idea_promotion_cycles_updated_at ON public.idea_promotion_cycles;
CREATE TRIGGER update_idea_promotion_cycles_updated_at
  BEFORE UPDATE ON public.idea_promotion_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Counter sync helpers
CREATE OR REPLACE FUNCTION public.recompute_idea_counters(p_idea_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_upvotes INTEGER := 0;
  v_downvotes INTEGER := 0;
  v_score INTEGER := 0;
  v_comments INTEGER := 0;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE value = 1)::INTEGER,
    COUNT(*) FILTER (WHERE value = -1)::INTEGER,
    COALESCE(SUM(value), 0)::INTEGER
  INTO v_upvotes, v_downvotes, v_score
  FROM public.idea_votes
  WHERE idea_id = p_idea_id;

  SELECT COUNT(*)::INTEGER
  INTO v_comments
  FROM public.comments
  WHERE subject_type = 'idea'
    AND subject_id = p_idea_id;

  UPDATE public.ideas
  SET
    upvotes = v_upvotes,
    downvotes = v_downvotes,
    score = v_score,
    comments_count = v_comments,
    last_activity_at = NOW()
  WHERE id = p_idea_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_idea_counters_from_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_idea_counters(OLD.idea_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.idea_id <> NEW.idea_id THEN
    PERFORM public.recompute_idea_counters(OLD.idea_id);
  END IF;

  PERFORM public.recompute_idea_counters(NEW.idea_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_idea_counters_from_votes ON public.idea_votes;
CREATE TRIGGER trigger_sync_idea_counters_from_votes
  AFTER INSERT OR UPDATE OR DELETE ON public.idea_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_idea_counters_from_votes();

CREATE OR REPLACE FUNCTION public.sync_idea_counters_from_comments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.subject_type = 'idea' THEN
    PERFORM public.recompute_idea_counters(OLD.subject_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.subject_type = 'idea' THEN
    PERFORM public.recompute_idea_counters(NEW.subject_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_idea_counters_from_comments ON public.comments;
CREATE TRIGGER trigger_sync_idea_counters_from_comments
  AFTER INSERT OR UPDATE OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_idea_counters_from_comments();
