-- ===========================================================================
-- Migration: Sprint proportional task-pool points payout
-- Purpose:
--   Replace the per-approval flat points grant with a single proportional
--   split at sprint-close time, so:
--     - A task with pool P and submitters with scores [s1..sN] distributes
--       floor(P * si/sum(s)) to each submitter with si > 0.
--     - Rounding leftovers (and all-zero pools) carry over to the next sprint.
--     - Points are only credited once per sprint, at settlement.
-- ===========================================================================

-- 1) Disable the per-submission live points grant trigger.
DROP TRIGGER IF EXISTS trigger_update_user_points_on_submission ON public.task_submissions;

-- 2) Allow quality_score = 0 (explicit spam mark, alongside the existing
--    reject action). Range becomes 0..5.
ALTER TABLE public.task_submissions
  DROP CONSTRAINT IF EXISTS task_submissions_quality_score_check;

ALTER TABLE public.task_submissions
  ADD CONSTRAINT task_submissions_quality_score_check
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 5));

-- 3) Add carryover balance column to sprints.
ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS points_carryover INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sprints.points_carryover IS
  'Running points carryover balance: previous sprint carryover + this sprint''s rounding leftovers and all-zero pools.';

-- 4) Idempotency for settlement ledger entries. source_id pattern:
--    "<sprint_id>:<task_id>:<user_id>". A partial unique index makes
--    re-running settle_sprint_task_points a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_sprint_task_settlement
  ON public.points_ledger (source_id)
  WHERE source_type = 'sprint_task_settlement';

-- 5) Core settlement function.
CREATE OR REPLACE FUNCTION public.settle_sprint_task_points(p_sprint_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task           RECORD;
  v_sub            RECORD;
  v_pool           INTEGER;
  v_sum_scores     INTEGER;
  v_payout         INTEGER;
  v_distributed    INTEGER;
  v_leftover_total INTEGER := 0;
  v_paid_total     INTEGER := 0;
  v_user_count     INTEGER := 0;
  v_prev_carry     INTEGER := 0;
  v_new_carry      INTEGER := 0;
  v_ledger_key     TEXT;
  v_new_balance    INTEGER;
BEGIN
  -- Load prior carryover from the most recently completed sprint.
  SELECT COALESCE(points_carryover, 0)
  INTO v_prev_carry
  FROM public.sprints
  WHERE status = 'completed'
    AND id <> p_sprint_id
  ORDER BY COALESCE(completed_at, updated_at) DESC
  LIMIT 1;

  v_prev_carry := COALESCE(v_prev_carry, 0);

  -- Walk each task in the sprint.
  FOR v_task IN
    SELECT id, COALESCE(base_points, points, 0) AS pool
    FROM public.tasks
    WHERE sprint_id = p_sprint_id
  LOOP
    v_pool := COALESCE(v_task.pool, 0);
    IF v_pool <= 0 THEN
      CONTINUE;
    END IF;

    -- Sum effective scores. rejected = 0, approved = quality_score (0..5),
    -- anything else (pending, disputed) should have been blocked earlier.
    SELECT COALESCE(SUM(
      CASE
        WHEN review_status = 'approved' THEN COALESCE(quality_score, 0)
        ELSE 0
      END
    ), 0)::INTEGER
    INTO v_sum_scores
    FROM public.task_submissions
    WHERE task_id = v_task.id;

    IF v_sum_scores <= 0 THEN
      -- Whole pool carries over (spam task, or all rejected).
      v_leftover_total := v_leftover_total + v_pool;
      CONTINUE;
    END IF;

    v_distributed := 0;

    FOR v_sub IN
      SELECT id, user_id, review_status, quality_score
      FROM public.task_submissions
      WHERE task_id = v_task.id
        AND review_status = 'approved'
        AND COALESCE(quality_score, 0) > 0
    LOOP
      v_payout := FLOOR(v_pool::NUMERIC * v_sub.quality_score::NUMERIC / v_sum_scores::NUMERIC)::INTEGER;

      IF v_payout <= 0 THEN
        CONTINUE;
      END IF;

      v_ledger_key := p_sprint_id::TEXT || ':' || v_task.id::TEXT || ':' || v_sub.user_id::TEXT;

      -- Credit user.
      UPDATE public.user_profiles
      SET
        total_points = GREATEST(0, COALESCE(total_points, 0) + v_payout),
        claimable_points = GREATEST(0, COALESCE(claimable_points, 0) + v_payout)
      WHERE id = v_sub.user_id
      RETURNING claimable_points INTO v_new_balance;

      -- Idempotent ledger row.
      INSERT INTO public.points_ledger (
        user_id, amount, reason, source_type, source_id, balance_after
      )
      VALUES (
        v_sub.user_id,
        v_payout,
        'Sprint task settlement',
        'sprint_task_settlement',
        v_ledger_key,
        COALESCE(v_new_balance, v_payout)
      )
      ON CONFLICT (source_id) WHERE source_type = 'sprint_task_settlement' DO NOTHING;

      -- Update submission's earned_points to the settled value.
      UPDATE public.task_submissions
      SET earned_points = v_payout
      WHERE id = v_sub.id;

      v_distributed := v_distributed + v_payout;
      v_user_count := v_user_count + 1;
    END LOOP;

    v_paid_total := v_paid_total + v_distributed;

    -- Rounding leftover for this task carries over.
    IF v_distributed < v_pool THEN
      v_leftover_total := v_leftover_total + (v_pool - v_distributed);
    END IF;
  END LOOP;

  v_new_carry := v_prev_carry + v_leftover_total;

  UPDATE public.sprints
  SET points_carryover = v_new_carry
  WHERE id = p_sprint_id;

  RETURN jsonb_build_object(
    'sprint_id', p_sprint_id,
    'paid_total', v_paid_total,
    'user_payouts', v_user_count,
    'previous_carryover', v_prev_carry,
    'leftover', v_leftover_total,
    'carryover', v_new_carry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.settle_sprint_task_points(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_sprint_task_points(UUID) TO service_role;

-- 6) Extend settlement blockers to also block on pending submissions.
CREATE OR REPLACE FUNCTION public.get_sprint_settlement_blockers(p_sprint_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unresolved_disputes INTEGER := 0;
  v_pending_submissions INTEGER := 0;
  v_integrity_flags JSONB := '[]'::JSONB;
  v_integrity_flag_count INTEGER := 0;
  v_reasons JSONB := '[]'::JSONB;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_unresolved_disputes
  FROM public.disputes
  WHERE sprint_id = p_sprint_id
    AND status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated');

  SELECT COUNT(*)::INTEGER
  INTO v_pending_submissions
  FROM public.task_submissions ts
  JOIN public.tasks t ON t.id = ts.task_id
  WHERE t.sprint_id = p_sprint_id
    AND ts.review_status = 'pending';

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

  IF v_pending_submissions > 0 THEN
    v_reasons := v_reasons || jsonb_build_array(
      format('%s submission(s) still pending review', v_pending_submissions)
    );
  END IF;

  IF v_integrity_flag_count > 0 THEN
    v_reasons := v_reasons || jsonb_build_array(
      'unresolved integrity flags are present'
    );
  END IF;

  RETURN jsonb_build_object(
    'blocked',
    (v_unresolved_disputes > 0 OR v_pending_submissions > 0 OR v_integrity_flag_count > 0),
    'unresolved_disputes',
    v_unresolved_disputes,
    'pending_submissions',
    v_pending_submissions,
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
