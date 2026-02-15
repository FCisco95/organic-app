-- ===========================================================================
-- Migration: Dispute Resolution System (Phase 16)
-- Purpose: Task submission disputes with XP staking, 3-tier escalation
--          (mediation → council → admin), and arbitrator rewards
-- ===========================================================================

-- ─── 1. Enum types ────────────────────────────────────────────────────────

CREATE TYPE dispute_status AS ENUM (
  'open',
  'mediation',
  'awaiting_response',
  'under_review',
  'resolved',
  'appealed',
  'appeal_review',
  'dismissed',
  'withdrawn',
  'mediated'
);

CREATE TYPE dispute_tier AS ENUM (
  'mediation',
  'council',
  'admin'
);

CREATE TYPE dispute_resolution AS ENUM (
  'overturned',
  'upheld',
  'compromise',
  'dismissed'
);

CREATE TYPE dispute_reason AS ENUM (
  'rejected_unfairly',
  'low_quality_score',
  'plagiarism_claim',
  'reviewer_bias',
  'other'
);

-- ─── 2. Add dispute activity event types ──────────────────────────────────

DO $$
BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'dispute_created';
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'dispute_response_submitted';
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'dispute_escalated';
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'dispute_resolved';
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'dispute_withdrawn';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Add 'disputes' to notification_category enum ──────────────────────

DO $$
BEGIN
  ALTER TYPE notification_category ADD VALUE IF NOT EXISTS 'disputes';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Core disputes table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disputes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
  task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sprint_id           UUID REFERENCES sprints(id) ON DELETE SET NULL,
  disputant_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reviewer_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  arbitrator_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  status              dispute_status NOT NULL DEFAULT 'open',
  tier                dispute_tier NOT NULL DEFAULT 'mediation',
  reason              dispute_reason NOT NULL,

  -- Disputant evidence (immutable after creation — new evidence via comments)
  evidence_text       TEXT NOT NULL,
  evidence_links      TEXT[] DEFAULT '{}',

  -- Reviewer counter-argument
  response_text       TEXT,
  response_links      TEXT[] DEFAULT '{}',
  response_deadline   TIMESTAMPTZ,
  response_submitted_at TIMESTAMPTZ,

  -- Resolution
  resolution          dispute_resolution,
  resolution_notes    TEXT,
  new_quality_score   INTEGER CHECK (new_quality_score IS NULL OR (new_quality_score >= 1 AND new_quality_score <= 5)),
  resolved_at         TIMESTAMPTZ,

  -- XP staking
  xp_stake            INTEGER NOT NULL CHECK (xp_stake > 0),
  xp_refunded         BOOLEAN NOT NULL DEFAULT false,

  -- Deadlines
  mediation_deadline  TIMESTAMPTZ,
  appeal_deadline     TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Safety constraints
  CONSTRAINT disputes_no_self_dispute CHECK (disputant_id != reviewer_id),
  CONSTRAINT disputes_no_conflict_of_interest CHECK (arbitrator_id IS NULL OR arbitrator_id != reviewer_id)
);

-- One active dispute per submission
CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_active_per_submission
  ON disputes (submission_id)
  WHERE status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated');

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_disputes_disputant ON disputes (disputant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_reviewer ON disputes (reviewer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_arbitrator ON disputes (arbitrator_id, created_at DESC) WHERE arbitrator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status, tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_sprint ON disputes (sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disputes_task ON disputes (task_id);

-- ─── 5. Dispute comments table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dispute_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'parties_only' CHECK (visibility IN ('parties_only', 'arbitrator', 'public')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_comments_dispute ON dispute_comments (dispute_id, created_at);

-- ─── 6. RLS policies ─────────────────────────────────────────────────────

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_comments ENABLE ROW LEVEL SECURITY;

-- Disputes: public existence (limited columns via API), full access for parties
-- All authenticated users can see disputes exist (for transparency)
CREATE POLICY "Authenticated users can view disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (true);

-- Only disputant can insert
CREATE POLICY "Disputant can create disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = disputant_id);

-- Parties and arbitrators can update (status changes enforced in API)
CREATE POLICY "Parties and arbitrators can update disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = disputant_id
    OR auth.uid() = reviewer_id
    OR auth.uid() = arbitrator_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Dispute comments: visible to parties + arbitrator + admin
CREATE POLICY "Dispute parties can view comments"
  ON dispute_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_id
        AND (
          auth.uid() = d.disputant_id
          OR auth.uid() = d.reviewer_id
          OR auth.uid() = d.arbitrator_id
          OR EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- Only parties + arbitrator can add comments
CREATE POLICY "Dispute parties can add comments"
  ON dispute_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_id
        AND (
          auth.uid() = d.disputant_id
          OR auth.uid() = d.reviewer_id
          OR auth.uid() = d.arbitrator_id
          OR EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- ─── 7. Auto-update updated_at ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_disputes_updated_at();

-- ─── 8. Activity log trigger for disputes ─────────────────────────────────

CREATE OR REPLACE FUNCTION log_dispute_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_event_type activity_event_type;
  v_actor_id   UUID;
  v_metadata   JSONB;
  v_task_title TEXT;
BEGIN
  -- Get task title for metadata
  SELECT title INTO v_task_title FROM tasks WHERE id = NEW.task_id;

  -- Determine event type and actor based on status change
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'dispute_created';
    v_actor_id := NEW.disputant_id;
    v_metadata := jsonb_build_object(
      'task_id', NEW.task_id,
      'task_title', COALESCE(v_task_title, ''),
      'submission_id', NEW.submission_id,
      'reason', NEW.reason::text,
      'tier', NEW.tier::text,
      'xp_stake', NEW.xp_stake
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Skip if status hasn't changed
    IF OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;

    v_metadata := jsonb_build_object(
      'task_id', NEW.task_id,
      'task_title', COALESCE(v_task_title, ''),
      'submission_id', NEW.submission_id,
      'old_status', OLD.status::text,
      'new_status', NEW.status::text,
      'tier', NEW.tier::text
    );

    CASE NEW.status
      WHEN 'awaiting_response' THEN
        v_event_type := 'dispute_response_submitted';
        v_actor_id := NEW.reviewer_id;
      WHEN 'under_review', 'appeal_review' THEN
        v_event_type := 'dispute_escalated';
        v_actor_id := COALESCE(NEW.arbitrator_id, NEW.disputant_id);
        v_metadata := v_metadata || jsonb_build_object('arbitrator_id', NEW.arbitrator_id);
      WHEN 'resolved', 'dismissed' THEN
        v_event_type := 'dispute_resolved';
        v_actor_id := COALESCE(NEW.arbitrator_id, NEW.disputant_id);
        v_metadata := v_metadata || jsonb_build_object(
          'resolution', COALESCE(NEW.resolution::text, ''),
          'new_quality_score', NEW.new_quality_score
        );
      WHEN 'withdrawn' THEN
        v_event_type := 'dispute_withdrawn';
        v_actor_id := NEW.disputant_id;
      WHEN 'mediated' THEN
        v_event_type := 'dispute_resolved';
        v_actor_id := NEW.disputant_id;
        v_metadata := v_metadata || jsonb_build_object('resolution', 'mediated');
      WHEN 'appealed' THEN
        v_event_type := 'dispute_escalated';
        v_actor_id := NEW.disputant_id;
        v_metadata := v_metadata || jsonb_build_object('appeal', true);
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_log (event_type, actor_id, subject_type, subject_id, metadata)
  VALUES (v_event_type, v_actor_id, 'dispute', NEW.id, v_metadata);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_dispute_activity
  AFTER INSERT OR UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION log_dispute_activity();

-- ─── 9. Auto-follow for dispute parties ───────────────────────────────────

CREATE OR REPLACE FUNCTION auto_follow_dispute_parties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Auto-follow the related task for both parties
  INSERT INTO user_follows (user_id, subject_type, subject_id)
  VALUES
    (NEW.disputant_id, 'task', NEW.task_id),
    (NEW.reviewer_id, 'task', NEW.task_id)
  ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_follow_dispute
  AFTER INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION auto_follow_dispute_parties();

-- Auto-follow when arbitrator is assigned
CREATE OR REPLACE FUNCTION auto_follow_dispute_arbitrator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  IF NEW.arbitrator_id IS NOT NULL AND (OLD.arbitrator_id IS NULL OR OLD.arbitrator_id != NEW.arbitrator_id) THEN
    INSERT INTO user_follows (user_id, subject_type, subject_id)
    VALUES (NEW.arbitrator_id, 'task', NEW.task_id)
    ON CONFLICT (user_id, subject_type, subject_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_follow_dispute_arbitrator
  AFTER UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION auto_follow_dispute_arbitrator();

-- ─── 10. XP effects on dispute resolution ─────────────────────────────────

CREATE OR REPLACE FUNCTION apply_dispute_xp_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_config         JSONB;
  v_reviewer_penalty INTEGER;
  v_arbitrator_reward INTEGER;
  v_withdrawal_fee INTEGER;
  v_refund_amount  INTEGER;
BEGIN
  -- Only process terminal status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated') THEN
    RETURN NEW;
  END IF;

  -- Load config
  SELECT gamification_config INTO v_config FROM orgs LIMIT 1;
  v_reviewer_penalty := COALESCE((v_config->>'xp_dispute_reviewer_penalty')::integer, 30);
  v_arbitrator_reward := COALESCE((v_config->>'xp_dispute_arbitrator_reward')::integer, 25);
  v_withdrawal_fee := COALESCE((v_config->>'xp_dispute_withdrawal_fee')::integer, 10);

  -- Apply XP effects based on resolution
  CASE
    WHEN NEW.status = 'resolved' AND NEW.resolution = 'overturned' THEN
      -- Refund disputant stake
      UPDATE user_profiles
      SET xp_total = xp_total + NEW.xp_stake,
          level = calculate_level_from_xp(xp_total + NEW.xp_stake)
      WHERE id = NEW.disputant_id;

      -- Penalize reviewer
      UPDATE user_profiles
      SET xp_total = GREATEST(0, xp_total - v_reviewer_penalty),
          level = calculate_level_from_xp(GREATEST(0, xp_total - v_reviewer_penalty))
      WHERE id = NEW.reviewer_id;

      -- Log XP events
      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES
        (NEW.disputant_id, 'dispute_resolved_for', 'dispute', NEW.id, NEW.xp_stake,
         jsonb_build_object('resolution', 'overturned', 'type', 'stake_refund')),
        (NEW.reviewer_id, 'dispute_resolved_against', 'dispute', NEW.id, -v_reviewer_penalty,
         jsonb_build_object('resolution', 'overturned', 'type', 'reviewer_penalty'));

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    WHEN NEW.status = 'resolved' AND NEW.resolution = 'compromise' THEN
      -- Refund disputant stake (no reviewer penalty)
      UPDATE user_profiles
      SET xp_total = xp_total + NEW.xp_stake,
          level = calculate_level_from_xp(xp_total + NEW.xp_stake)
      WHERE id = NEW.disputant_id;

      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_for', 'dispute', NEW.id, NEW.xp_stake,
              jsonb_build_object('resolution', 'compromise', 'type', 'stake_refund'));

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    WHEN NEW.status = 'resolved' AND NEW.resolution = 'upheld' THEN
      -- Disputant loses stake (already deducted on filing)
      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_against', 'dispute', NEW.id, -NEW.xp_stake,
              jsonb_build_object('resolution', 'upheld', 'type', 'stake_lost'));

    WHEN NEW.status = 'dismissed' THEN
      -- Disputant loses stake (already deducted on filing)
      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_against', 'dispute', NEW.id, -NEW.xp_stake,
              jsonb_build_object('resolution', 'dismissed', 'type', 'stake_lost'));

    WHEN NEW.status = 'withdrawn' THEN
      -- Partial refund: stake minus withdrawal fee
      v_refund_amount := GREATEST(0, NEW.xp_stake - v_withdrawal_fee);
      IF v_refund_amount > 0 THEN
        UPDATE user_profiles
        SET xp_total = xp_total + v_refund_amount,
            level = calculate_level_from_xp(xp_total + v_refund_amount)
        WHERE id = NEW.disputant_id;
      END IF;

      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_against', 'dispute', NEW.id,
              -LEAST(v_withdrawal_fee, NEW.xp_stake),
              jsonb_build_object('resolution', 'withdrawn', 'type', 'withdrawal_fee',
                                 'refunded', v_refund_amount));

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    WHEN NEW.status = 'mediated' THEN
      -- Full refund
      UPDATE user_profiles
      SET xp_total = xp_total + NEW.xp_stake,
          level = calculate_level_from_xp(xp_total + NEW.xp_stake)
      WHERE id = NEW.disputant_id;

      INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
      VALUES (NEW.disputant_id, 'dispute_resolved_for', 'dispute', NEW.id, NEW.xp_stake,
              jsonb_build_object('resolution', 'mediated', 'type', 'stake_refund'));

      UPDATE disputes SET xp_refunded = true WHERE id = NEW.id;

    ELSE
      NULL;
  END CASE;

  -- Award arbitrator XP (for all terminal statuses except withdrawn/mediated)
  IF NEW.arbitrator_id IS NOT NULL AND NEW.status IN ('resolved', 'dismissed') THEN
    UPDATE user_profiles
    SET xp_total = xp_total + v_arbitrator_reward,
        level = calculate_level_from_xp(xp_total + v_arbitrator_reward)
    WHERE id = NEW.arbitrator_id;

    INSERT INTO xp_events (user_id, event_type, source_type, source_id, xp_amount, metadata)
    VALUES (NEW.arbitrator_id, 'dispute_arbitrated', 'dispute', NEW.id, v_arbitrator_reward,
            jsonb_build_object('resolution', COALESCE(NEW.resolution::text, NEW.status::text),
                               'type', 'arbitrator_reward'));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_dispute_xp_effects
  AFTER UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION apply_dispute_xp_effects();

-- ─── 11. Update notification category mapper ──────────────────────────────

CREATE OR REPLACE FUNCTION get_notification_category(evt activity_event_type)
RETURNS notification_category AS $$
BEGIN
  CASE evt
    WHEN 'task_created', 'task_status_changed', 'task_completed', 'task_deleted',
         'submission_created', 'submission_reviewed' THEN
      RETURN 'tasks';
    WHEN 'proposal_created', 'proposal_status_changed', 'proposal_deleted' THEN
      RETURN 'proposals';
    WHEN 'vote_cast', 'voting_reminder_24h', 'voting_reminder_1h' THEN
      RETURN 'voting';
    WHEN 'comment_created', 'comment_deleted' THEN
      RETURN 'comments';
    WHEN 'dispute_created', 'dispute_response_submitted', 'dispute_escalated',
         'dispute_resolved', 'dispute_withdrawn' THEN
      RETURN 'disputes';
    ELSE
      RETURN 'system';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 12. Update resolve_follow_target to handle disputes ──────────────────

CREATE OR REPLACE FUNCTION resolve_follow_target(
  p_subject_type TEXT,
  p_subject_id UUID,
  p_metadata JSONB
) RETURNS TABLE(target_type TEXT, target_id UUID) AS $$
BEGIN
  CASE p_subject_type
    WHEN 'task' THEN
      RETURN QUERY SELECT 'task'::TEXT, p_subject_id;
    WHEN 'submission' THEN
      RETURN QUERY SELECT 'task'::TEXT, (p_metadata->>'task_id')::UUID;
    WHEN 'comment' THEN
      RETURN QUERY SELECT 'task'::TEXT, (p_metadata->>'task_id')::UUID;
    WHEN 'proposal' THEN
      RETURN QUERY SELECT 'proposal'::TEXT, p_subject_id;
    WHEN 'vote' THEN
      RETURN QUERY SELECT 'proposal'::TEXT, (p_metadata->>'proposal_id')::UUID;
    WHEN 'dispute' THEN
      -- Disputes follow their associated task
      RETURN QUERY SELECT 'task'::TEXT, (p_metadata->>'task_id')::UUID;
    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 13. Add dispute activity counts ──────────────────────────────────────

ALTER TABLE user_activity_counts
  ADD COLUMN IF NOT EXISTS disputes_filed    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputes_resolved INTEGER NOT NULL DEFAULT 0;

-- ─── 14. Update award_xp to handle dispute events ────────────────────────
-- (Dispute XP is handled by the dedicated trigger above, so we just need
--  to update activity counts here)

-- ─── 15. Seed dispute-related achievements ────────────────────────────────

INSERT INTO achievements (id, name, description, icon, category, condition_type, condition_field, condition_threshold, xp_reward)
VALUES
  ('first_arbiter',    'First Arbiter',     'Resolve your first dispute as arbitrator',   '⚖️', 'governance', 'counter', 'disputes_resolved', 1,  50),
  ('justice_keeper',   'Justice Keeper',    'Resolve 10 disputes as arbitrator',          '🏛️', 'governance', 'counter', 'disputes_resolved', 10, 200),
  ('peacemaker',       'Peacemaker',        'Mediate 5 disputes successfully',            '🕊️', 'community',  'counter', 'disputes_resolved', 5,  100),
  ('vindicated',       'Vindicated',        'Win your first dispute as disputant',        '✊', 'milestone',  'counter', 'disputes_filed',    1,  25)
ON CONFLICT (id) DO NOTHING;

-- ─── 16. Default dispute config in gamification_config ────────────────────
-- Merge dispute defaults into existing gamification_config

UPDATE orgs
SET gamification_config = gamification_config || '{
  "xp_dispute_stake": 50,
  "xp_dispute_arbitrator_reward": 25,
  "xp_dispute_reviewer_penalty": 30,
  "xp_dispute_withdrawal_fee": 10,
  "dispute_mediation_hours": 24,
  "dispute_response_hours": 48,
  "dispute_appeal_hours": 48,
  "dispute_cooldown_days": 7,
  "dispute_min_xp_to_file": 100
}'::jsonb
WHERE NOT gamification_config ? 'xp_dispute_stake';

-- ─── 17. Performance indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_disputes_submission ON disputes (submission_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes (created_at DESC);
