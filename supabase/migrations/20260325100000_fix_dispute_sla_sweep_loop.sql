-- Fix: sweep_overdue_dispute_reviewer_sla was causing infinite escalation loops.
--
-- Two bugs:
--   1. Disputes already at 'admin' tier (the highest) were re-matched every sweep
--      because the tier CASE fell through to ELSE (no-op), but the row was still
--      updated with a new response_deadline — causing it to be picked up again.
--   2. The dedupe_key included a per-minute timestamp, so every 15-minute sweep
--      generated fresh notification rows instead of deduplicating.
--
-- Fixes:
--   a. Exclude disputes already at 'admin' tier from the overdue CTE.
--   b. Use a stable dedupe_key per dispute+tier (no timestamp), so only one
--      notification per escalation event per admin.
--   c. Clean up any remaining bloated dispute_escalated notifications.
--   d. Re-enable the cron job with the fixed function.

-- 1) Replace the function with the fixed version
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
      -- Only escalate if there is a higher tier to escalate TO
      AND d.tier IN ('mediation', 'council')
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
      -- Stable dedupe key: one notification per dispute per tier escalation per admin
      format(
        'dispute:%s:escalated:%s_to_%s',
        u.id::TEXT,
        u.previous_tier,
        CASE u.previous_tier
          WHEN 'mediation' THEN 'council'
          WHEN 'council' THEN 'admin'
        END
      )
    FROM updated u
    CROSS JOIN public.user_profiles up
    WHERE up.role = 'admin'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = up.id
          AND n.dedupe_key = format(
            'dispute:%s:escalated:%s_to_%s',
            u.id::TEXT,
            u.previous_tier,
            CASE u.previous_tier
              WHEN 'mediation' THEN 'council'
              WHEN 'council' THEN 'admin'
            END
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

-- 2) Clean up any remaining bloated notifications from the old bug
DELETE FROM public.notifications
WHERE event_type = 'dispute_escalated'
  AND dedupe_key LIKE 'dispute:%:reviewer_sla:%';

-- 3) Re-enable the cron job with the fixed function
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
