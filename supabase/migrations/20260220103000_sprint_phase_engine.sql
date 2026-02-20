-- ============================================================================
-- Migration: Sprint phase engine revamp
-- Purpose:
--   - Extend sprint lifecycle phases: planning -> active -> review
--     -> dispute_window -> settlement -> completed
--   - Enforce forward-only transitions at DB level
--   - Add settlement integrity blockers
--   - Add reviewer SLA auto-escalation helper for overdue disputes
-- ============================================================================

-- 1) Extend sprint status enum for phase engine.
ALTER TYPE public.sprint_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.sprint_status ADD VALUE IF NOT EXISTS 'dispute_window';
ALTER TYPE public.sprint_status ADD VALUE IF NOT EXISTS 'settlement';

-- 2) Add phase timestamps and settlement integrity metadata.
ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS active_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_window_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_window_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settlement_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settlement_integrity_flags JSONB NOT NULL DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS settlement_blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sprints_dispute_window_bounds_check'
  ) THEN
    ALTER TABLE public.sprints
      ADD CONSTRAINT sprints_dispute_window_bounds_check
      CHECK (
        dispute_window_ends_at IS NULL
        OR dispute_window_started_at IS NULL
        OR dispute_window_ends_at >= dispute_window_started_at
      );
  END IF;
END $$;

-- 3) Backfill baseline phase timestamps for existing rows.
UPDATE public.sprints
SET active_started_at = COALESCE(active_started_at, start_at, created_at, NOW())
WHERE active_started_at IS NULL
  AND status::TEXT IN ('active', 'review', 'dispute_window', 'settlement', 'completed');

UPDATE public.sprints
SET completed_at = COALESCE(completed_at, updated_at, end_at, NOW())
WHERE completed_at IS NULL
  AND status::TEXT = 'completed';

-- 4) Indexes for phase queries and single in-flight sprint safety.
CREATE INDEX IF NOT EXISTS idx_sprints_status
  ON public.sprints(status);

CREATE INDEX IF NOT EXISTS idx_sprints_dispute_window_ends_at
  ON public.sprints(dispute_window_ends_at)
  WHERE dispute_window_ends_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sprints_single_execution_phase
  ON public.sprints((1))
  WHERE status IN (
    'active'::public.sprint_status,
    'review'::public.sprint_status,
    'dispute_window'::public.sprint_status,
    'settlement'::public.sprint_status
  );

-- 5) Settlement blockers helper RPC.
CREATE OR REPLACE FUNCTION public.get_sprint_settlement_blockers(p_sprint_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unresolved_disputes INTEGER := 0;
  v_integrity_flags JSONB := '[]'::JSONB;
  v_integrity_flag_count INTEGER := 0;
  v_reasons JSONB := '[]'::JSONB;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_unresolved_disputes
  FROM public.disputes
  WHERE sprint_id = p_sprint_id
    AND status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated');

  SELECT COALESCE(settlement_integrity_flags, '[]'::JSONB)
  INTO v_integrity_flags
  FROM public.sprints
  WHERE id = p_sprint_id;

  IF jsonb_typeof(v_integrity_flags) = 'array' THEN
    v_integrity_flag_count := jsonb_array_length(v_integrity_flags);
  ELSE
    v_integrity_flag_count := 1;
    v_integrity_flags := jsonb_build_array(v_integrity_flags);
  END IF;

  IF v_unresolved_disputes > 0 THEN
    v_reasons := v_reasons || jsonb_build_array(
      format('%s unresolved dispute(s)', v_unresolved_disputes)
    );
  END IF;

  IF v_integrity_flag_count > 0 THEN
    v_reasons := v_reasons || jsonb_build_array(
      'unresolved integrity flags are present'
    );
  END IF;

  RETURN jsonb_build_object(
    'blocked',
    (v_unresolved_disputes > 0 OR v_integrity_flag_count > 0),
    'unresolved_disputes',
    v_unresolved_disputes,
    'integrity_flag_count',
    v_integrity_flag_count,
    'integrity_flags',
    v_integrity_flags,
    'reasons',
    v_reasons
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sprint_settlement_blockers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sprint_settlement_blockers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sprint_settlement_blockers(UUID) TO service_role;

-- 6) Reviewer SLA escalation helper RPC (default +24h extension).
CREATE OR REPLACE FUNCTION public.apply_sprint_reviewer_sla(
  p_sprint_id UUID,
  p_extension_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  escalated_count INTEGER,
  extended_count INTEGER,
  admin_notified_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_extension_interval INTERVAL := make_interval(hours => GREATEST(1, p_extension_hours));
  v_escalated_count INTEGER := 0;
  v_notified_count INTEGER := 0;
BEGIN
  WITH overdue AS (
    SELECT id
    FROM public.disputes
    WHERE sprint_id = p_sprint_id
      AND status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated')
      AND response_deadline IS NOT NULL
      AND response_deadline <= NOW()
  ),
  updated AS (
    UPDATE public.disputes d
    SET
      tier = CASE d.tier
        WHEN 'mediation' THEN 'council'::dispute_tier
        WHEN 'council' THEN 'admin'::dispute_tier
        ELSE d.tier
      END,
      status = CASE
        WHEN d.status IN ('appealed', 'appeal_review') THEN 'appeal_review'::dispute_status
        ELSE 'under_review'::dispute_status
      END,
      arbitrator_id = NULL,
      response_deadline = GREATEST(COALESCE(d.response_deadline, NOW()), NOW()) + v_extension_interval,
      appeal_deadline = CASE
        WHEN d.tier = 'council'
          THEN GREATEST(COALESCE(d.appeal_deadline, NOW()), NOW()) + v_extension_interval
        ELSE d.appeal_deadline
      END
    FROM overdue o
    WHERE d.id = o.id
    RETURNING d.id
  )
  SELECT COUNT(*)::INTEGER
  INTO v_escalated_count
  FROM updated;

  IF v_escalated_count > 0 THEN
    INSERT INTO public.activity_log (
      event_type,
      actor_id,
      subject_type,
      subject_id,
      metadata
    )
    VALUES (
      'dispute_escalated',
      NULL,
      'sprint',
      p_sprint_id,
      jsonb_build_object(
        'source', 'apply_sprint_reviewer_sla',
        'sprint_id', p_sprint_id,
        'escalated_count', v_escalated_count,
        'extension_hours', GREATEST(1, p_extension_hours)
      )
    );

    INSERT INTO public.notifications (
      user_id,
      event_type,
      category,
      actor_id,
      subject_type,
      subject_id,
      metadata,
      dedupe_key
    )
    SELECT
      up.id,
      'dispute_escalated',
      'disputes',
      NULL,
      'sprint',
      p_sprint_id,
      jsonb_build_object(
        'source', 'apply_sprint_reviewer_sla',
        'sprint_id', p_sprint_id,
        'escalated_count', v_escalated_count,
        'extension_hours', GREATEST(1, p_extension_hours)
      ),
      format(
        'sprint:%s:reviewer_sla:%s',
        p_sprint_id::TEXT,
        to_char(NOW(), 'YYYYMMDDHH24')
      )
    FROM public.user_profiles up
    WHERE up.role = 'admin'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = up.id
          AND n.dedupe_key = format(
            'sprint:%s:reviewer_sla:%s',
            p_sprint_id::TEXT,
            to_char(NOW(), 'YYYYMMDDHH24')
          )
      );

    GET DIAGNOSTICS v_notified_count = ROW_COUNT;
  END IF;

  RETURN QUERY
  SELECT v_escalated_count, v_escalated_count, v_notified_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_sprint_reviewer_sla(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_sprint_reviewer_sla(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_sprint_reviewer_sla(UUID, INTEGER) TO service_role;

-- 7) Forward-only sprint phase transition guard.
CREATE OR REPLACE FUNCTION public.enforce_sprint_phase_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status TEXT := COALESCE(OLD.status::TEXT, 'planning');
  v_new_status TEXT := COALESCE(NEW.status::TEXT, 'planning');
  v_blockers JSONB;
  v_block_reason TEXT;
BEGIN
  IF NEW.settlement_integrity_flags IS NULL THEN
    NEW.settlement_integrity_flags := '[]'::JSONB;
  ELSIF jsonb_typeof(NEW.settlement_integrity_flags) <> 'array' THEN
    RAISE EXCEPTION 'settlement_integrity_flags must be a JSON array';
  END IF;

  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;

  IF v_old_status = 'completed' THEN
    RAISE EXCEPTION 'cannot transition from terminal sprint status %', v_old_status;
  END IF;

  IF v_old_status = 'planning' AND v_new_status <> 'active' THEN
    RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
  ELSIF v_old_status = 'active' AND v_new_status <> 'review' THEN
    RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
  ELSIF v_old_status = 'review' AND v_new_status <> 'dispute_window' THEN
    RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
  ELSIF v_old_status = 'dispute_window' AND v_new_status <> 'settlement' THEN
    RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
  ELSIF v_old_status = 'settlement' AND v_new_status <> 'completed' THEN
    RAISE EXCEPTION 'invalid transition from % to %', v_old_status, v_new_status;
  END IF;

  IF v_new_status = 'active' THEN
    NEW.active_started_at := COALESCE(NEW.active_started_at, NOW());
    NEW.settlement_blocked_reason := NULL;
  ELSIF v_new_status = 'review' THEN
    NEW.review_started_at := COALESCE(NEW.review_started_at, NOW());
    NEW.settlement_blocked_reason := NULL;
  ELSIF v_new_status = 'dispute_window' THEN
    NEW.dispute_window_started_at := COALESCE(NEW.dispute_window_started_at, NOW());
    NEW.dispute_window_ends_at := COALESCE(NEW.dispute_window_ends_at, NOW() + INTERVAL '48 hours');
    NEW.settlement_blocked_reason := NULL;
  ELSIF v_new_status = 'settlement' THEN
    IF NEW.dispute_window_ends_at IS NOT NULL AND NEW.dispute_window_ends_at > NOW() THEN
      RAISE EXCEPTION 'cannot enter settlement before dispute window ends at %', NEW.dispute_window_ends_at;
    END IF;

    v_blockers := public.get_sprint_settlement_blockers(NEW.id);
    IF COALESCE((v_blockers->>'blocked')::BOOLEAN, false) THEN
      SELECT string_agg(value, '; ')
      INTO v_block_reason
      FROM jsonb_array_elements_text(COALESCE(v_blockers->'reasons', '[]'::JSONB)) AS t(value);

      NEW.settlement_blocked_reason := COALESCE(v_block_reason, 'unknown settlement blocker');
      RAISE EXCEPTION 'cannot enter settlement: %', NEW.settlement_blocked_reason;
    END IF;

    NEW.settlement_started_at := COALESCE(NEW.settlement_started_at, NOW());
    NEW.settlement_blocked_reason := NULL;
  ELSIF v_new_status = 'completed' THEN
    v_blockers := public.get_sprint_settlement_blockers(NEW.id);
    IF COALESCE((v_blockers->>'blocked')::BOOLEAN, false) THEN
      SELECT string_agg(value, '; ')
      INTO v_block_reason
      FROM jsonb_array_elements_text(COALESCE(v_blockers->'reasons', '[]'::JSONB)) AS t(value);

      NEW.settlement_blocked_reason := COALESCE(v_block_reason, 'unknown settlement blocker');
      RAISE EXCEPTION 'cannot complete sprint: %', NEW.settlement_blocked_reason;
    END IF;

    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    NEW.settlement_blocked_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprints_enforce_phase_rules ON public.sprints;
CREATE TRIGGER trg_sprints_enforce_phase_rules
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sprint_phase_rules();
