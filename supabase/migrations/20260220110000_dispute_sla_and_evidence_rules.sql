-- ============================================================================
-- Migration: Dispute SLA and evidence lifecycle hardening
-- Purpose:
--   - Enforce reviewer SLA sweep automation (+24h extension on escalation)
--   - Add dispute evidence events with late markers
--   - Restrict dispute evidence to append-only event history
--   - Add deadline integrity checks and query indexes
-- ============================================================================

-- 1) Evidence event ledger (append-only).
CREATE TABLE IF NOT EXISTS public.dispute_evidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  is_late BOOLEAN NOT NULL DEFAULT false,
  late_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispute_evidence_events_dispute_path
  ON public.dispute_evidence_events(dispute_id, storage_path);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_events_dispute_created
  ON public.dispute_evidence_events(dispute_id, created_at DESC);

-- 2) Deadline integrity constraints for new/updated rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'disputes_response_deadline_after_created_check'
  ) THEN
    ALTER TABLE public.disputes
      ADD CONSTRAINT disputes_response_deadline_after_created_check
      CHECK (
        response_deadline IS NULL
        OR response_deadline >= created_at
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'disputes_appeal_deadline_after_resolved_check'
  ) THEN
    ALTER TABLE public.disputes
      ADD CONSTRAINT disputes_appeal_deadline_after_resolved_check
      CHECK (
        appeal_deadline IS NULL
        OR resolved_at IS NULL
        OR appeal_deadline >= resolved_at
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disputes_response_deadline_open
  ON public.disputes(response_deadline)
  WHERE response_deadline IS NOT NULL
    AND status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated');

-- 3) Append-only trigger guard.
CREATE OR REPLACE FUNCTION public.prevent_dispute_evidence_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'dispute_evidence_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_dispute_evidence_events_immutable_update ON public.dispute_evidence_events;
CREATE TRIGGER trg_dispute_evidence_events_immutable_update
  BEFORE UPDATE ON public.dispute_evidence_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_dispute_evidence_events_mutation();

DROP TRIGGER IF EXISTS trg_dispute_evidence_events_immutable_delete ON public.dispute_evidence_events;
CREATE TRIGGER trg_dispute_evidence_events_immutable_delete
  BEFORE DELETE ON public.dispute_evidence_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_dispute_evidence_events_mutation();

-- 4) RLS policies.
ALTER TABLE public.dispute_evidence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dispute evidence events are viewable by parties" ON public.dispute_evidence_events;
CREATE POLICY "Dispute evidence events are viewable by parties"
  ON public.dispute_evidence_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.disputes d
      LEFT JOIN public.user_profiles up ON up.id = auth.uid()
      WHERE d.id = dispute_evidence_events.dispute_id
        AND (
          auth.uid() = d.disputant_id
          OR auth.uid() = d.reviewer_id
          OR auth.uid() = d.arbitrator_id
          OR up.role IN ('admin', 'council')
        )
    )
  );

DROP POLICY IF EXISTS "Dispute evidence events are insertable by parties" ON public.dispute_evidence_events;
CREATE POLICY "Dispute evidence events are insertable by parties"
  ON public.dispute_evidence_events FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.disputes d
      LEFT JOIN public.user_profiles up ON up.id = auth.uid()
      WHERE d.id = dispute_evidence_events.dispute_id
        AND (
          auth.uid() = d.disputant_id
          OR auth.uid() = d.reviewer_id
          OR auth.uid() = d.arbitrator_id
          OR up.role IN ('admin', 'council')
        )
    )
  );

-- 5) SLA sweep RPC (global overdue reviewer escalation).
CREATE OR REPLACE FUNCTION public.sweep_overdue_dispute_reviewer_sla(
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
    SELECT d.id, d.tier, d.status, d.response_deadline
    FROM public.disputes d
    LEFT JOIN public.sprints s ON s.id = d.sprint_id
    WHERE d.status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated')
      AND d.response_deadline IS NOT NULL
      AND d.response_deadline <= NOW()
      AND (
        d.sprint_id IS NULL
        OR s.dispute_window_ends_at IS NULL
        OR s.dispute_window_ends_at > NOW()
      )
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
      END,
      updated_at = NOW()
    FROM overdue o
    WHERE d.id = o.id
    RETURNING d.id, o.tier AS previous_tier, o.status AS previous_status
  ),
  inserted_activity AS (
    INSERT INTO public.activity_log (
      event_type,
      actor_id,
      subject_type,
      subject_id,
      metadata
    )
    SELECT
      'dispute_escalated',
      NULL,
      'dispute',
      u.id,
      jsonb_build_object(
        'source', 'sweep_overdue_dispute_reviewer_sla',
        'dispute_id', u.id,
        'previous_tier', u.previous_tier,
        'previous_status', u.previous_status,
        'extension_hours', GREATEST(1, p_extension_hours)
      )
    FROM updated u
    RETURNING id
  ),
  inserted_notifications AS (
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
      'dispute',
      u.id,
      jsonb_build_object(
        'source', 'sweep_overdue_dispute_reviewer_sla',
        'dispute_id', u.id,
        'previous_tier', u.previous_tier,
        'previous_status', u.previous_status,
        'extension_hours', GREATEST(1, p_extension_hours)
      ),
      format(
        'dispute:%s:reviewer_sla:%s',
        u.id::TEXT,
        to_char(NOW(), 'YYYYMMDDHH24MI')
      )
    FROM updated u
    CROSS JOIN public.user_profiles up
    WHERE up.role = 'admin'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = up.id
          AND n.dedupe_key = format(
            'dispute:%s:reviewer_sla:%s',
            u.id::TEXT,
            to_char(NOW(), 'YYYYMMDDHH24MI')
          )
      )
    RETURNING id
  )
  SELECT
    COALESCE((SELECT COUNT(*)::INTEGER FROM updated), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM inserted_notifications), 0)
  INTO v_escalated_count, v_notified_count;

  RETURN QUERY
  SELECT v_escalated_count, v_escalated_count, v_notified_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_overdue_dispute_reviewer_sla(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_overdue_dispute_reviewer_sla(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_overdue_dispute_reviewer_sla(INTEGER) TO service_role;

-- 6) Background cron job for reviewer SLA sweeps.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'sweep-overdue-dispute-reviewer-sla'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'sweep-overdue-dispute-reviewer-sla',
    '*/15 * * * *',
    $job$SELECT * FROM public.sweep_overdue_dispute_reviewer_sla(24);$job$
  );
END $$;
