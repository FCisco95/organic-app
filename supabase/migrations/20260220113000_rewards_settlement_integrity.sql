-- ============================================================================
-- Migration: Rewards settlement integrity and emission safety
-- Purpose:
--   - Add append-only sprint settlement ledger events.
--   - Enforce settlement emission cap and carryover bounds.
--   - Harden payout/distribution idempotency paths.
-- ============================================================================

-- 1) Sprint settlement integrity fields.
ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS reward_settlement_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reward_settlement_committed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reward_settlement_idempotency_key TEXT,
ADD COLUMN IF NOT EXISTS reward_settlement_kill_switch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reward_emission_cap NUMERIC(20,9) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_carryover_amount NUMERIC(20,9) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_carryover_sprint_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sprints_reward_settlement_status_check'
  ) THEN
    ALTER TABLE public.sprints
      ADD CONSTRAINT sprints_reward_settlement_status_check
      CHECK (reward_settlement_status IN ('pending', 'committed', 'held', 'killed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sprints_reward_carryover_nonnegative_check'
  ) THEN
    ALTER TABLE public.sprints
      ADD CONSTRAINT sprints_reward_carryover_nonnegative_check
      CHECK (reward_carryover_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sprints_reward_carryover_streak_bounds_check'
  ) THEN
    ALTER TABLE public.sprints
      ADD CONSTRAINT sprints_reward_carryover_streak_bounds_check
      CHECK (reward_carryover_sprint_count BETWEEN 0 AND 3);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sprints_reward_settlement_status
  ON public.sprints(reward_settlement_status);

CREATE INDEX IF NOT EXISTS idx_sprints_reward_settlement_committed_at
  ON public.sprints(reward_settlement_committed_at DESC)
  WHERE reward_settlement_committed_at IS NOT NULL;

-- 2) Reward distributions idempotency metadata.
ALTER TABLE public.reward_distributions
ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
ADD COLUMN IF NOT EXISTS integrity_hold BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS integrity_reason TEXT;

-- Cleanup legacy duplicate claim payout rows before enforcing uniqueness.
WITH ranked_claim_distributions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY claim_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.reward_distributions
  WHERE type = 'claim'::distribution_type
    AND claim_id IS NOT NULL
)
DELETE FROM public.reward_distributions rd
USING ranked_claim_distributions ranked
WHERE rd.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_distributions_idempotency_key_unique
  ON public.reward_distributions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_distributions_claim_unique
  ON public.reward_distributions(claim_id)
  WHERE type = 'claim'::distribution_type
    AND claim_id IS NOT NULL;

-- 3) Append-only settlement events ledger.
CREATE TABLE IF NOT EXISTS public.reward_settlement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('settlement_committed', 'integrity_hold', 'kill_switch')
  ),
  idempotency_key TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_settlement_events_sprint_created
  ON public.reward_settlement_events(sprint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_settlement_events_type_created
  ON public.reward_settlement_events(event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_reward_settlement_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'reward_settlement_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_settlement_events_no_update ON public.reward_settlement_events;
CREATE TRIGGER trg_reward_settlement_events_no_update
  BEFORE UPDATE ON public.reward_settlement_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_reward_settlement_events_mutation();

DROP TRIGGER IF EXISTS trg_reward_settlement_events_no_delete ON public.reward_settlement_events;
CREATE TRIGGER trg_reward_settlement_events_no_delete
  BEFORE DELETE ON public.reward_settlement_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_reward_settlement_events_mutation();

-- 4) Settlement commit RPC with emission cap + carryover + kill-switch guards.
CREATE OR REPLACE FUNCTION public.commit_sprint_reward_settlement(
  p_sprint_id UUID,
  p_actor_id UUID DEFAULT auth.uid(),
  p_reason TEXT DEFAULT 'sprint_completion'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_reward_pool NUMERIC(20,9) := 0;
  v_rewards_config JSONB := '{}'::JSONB;
  v_fixed_cap NUMERIC(20,9) := 10000;
  v_emission_percent NUMERIC(12,6) := 0.01;
  v_treasury_balance NUMERIC(20,9) := 0;
  v_carryover_limit INTEGER := 3;
  v_fixed_cap_text TEXT;
  v_emission_percent_text TEXT;
  v_treasury_balance_text TEXT;
  v_carryover_limit_text TEXT;
  v_prev_carryover NUMERIC(20,9) := 0;
  v_prev_streak INTEGER := 0;
  v_carryover_in NUMERIC(20,9) := 0;
  v_emission_base NUMERIC(20,9) := 0;
  v_emission_cap NUMERIC(20,9) := 0;
  v_target_pool NUMERIC(20,9) := 0;
  v_dist_count INTEGER := 0;
  v_existing_epoch_count INTEGER := 0;
  v_total_distributed NUMERIC(20,9) := 0;
  v_carryover_out NUMERIC(20,9) := 0;
  v_next_streak INTEGER := 0;
  v_commit_key TEXT := format('reward-settlement-commit:%s', p_sprint_id::TEXT);
  v_hold_key TEXT;
  v_kill_key TEXT := format('reward-settlement-kill:%s', p_sprint_id::TEXT);
  v_hold_reason TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('commit_sprint_reward_settlement'),
    hashtext(COALESCE(p_sprint_id::TEXT, ''))
  );

  SELECT
    s.*,
    o.rewards_config AS org_rewards_config
  INTO v_sprint
  FROM public.sprints s
  LEFT JOIN public.orgs o ON o.id = s.org_id
  WHERE s.id = p_sprint_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'SPRINT_NOT_FOUND',
      'message', 'Sprint not found'
    );
  END IF;

  IF COALESCE(v_sprint.reward_settlement_status, 'pending') = 'committed' THEN
    SELECT COALESCE(COUNT(*), 0)::INTEGER, COALESCE(SUM(token_amount), 0)
    INTO v_dist_count, v_total_distributed
    FROM public.reward_distributions
    WHERE sprint_id = p_sprint_id
      AND type = 'epoch'::distribution_type;

    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_COMMITTED',
      'status', 'committed',
      'idempotency_key', COALESCE(v_sprint.reward_settlement_idempotency_key, v_commit_key),
      'distributed_count', v_dist_count,
      'distributed_tokens', v_total_distributed,
      'emission_cap', COALESCE(v_sprint.reward_emission_cap, 0),
      'carryover_out', COALESCE(v_sprint.reward_carryover_amount, 0),
      'carryover_streak', COALESCE(v_sprint.reward_carryover_sprint_count, 0)
    );
  END IF;

  IF COALESCE(v_sprint.reward_settlement_status, 'pending') = 'killed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'SETTLEMENT_KILLED',
      'status', 'killed',
      'message', COALESCE(v_sprint.settlement_blocked_reason, 'Reward settlement kill-switch is active')
    );
  END IF;

  IF COALESCE(v_sprint.status::TEXT, 'planning') NOT IN ('settlement', 'completed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'INVALID_SPRINT_PHASE',
      'status', COALESCE(v_sprint.status::TEXT, 'planning'),
      'message', 'Sprint must be in settlement/completed phase for reward settlement'
    );
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_existing_epoch_count
  FROM public.reward_distributions
  WHERE sprint_id = p_sprint_id
    AND type = 'epoch'::distribution_type;

  IF v_existing_epoch_count > 0 THEN
    UPDATE public.sprints
    SET
      reward_settlement_status = 'killed',
      reward_settlement_kill_switch_at = v_now,
      settlement_blocked_reason = 'duplicate epoch distribution path detected',
      settlement_integrity_flags = CASE
        WHEN settlement_integrity_flags IS NULL
          OR jsonb_typeof(settlement_integrity_flags) <> 'array'
          THEN jsonb_build_array(
            jsonb_build_object(
              'code', 'reward_settlement_duplicate_distribution',
              'detected_at', v_now,
              'sprint_id', p_sprint_id
            )
          )
        ELSE settlement_integrity_flags || jsonb_build_array(
          jsonb_build_object(
            'code', 'reward_settlement_duplicate_distribution',
            'detected_at', v_now,
            'sprint_id', p_sprint_id
          )
        )
      END
    WHERE id = p_sprint_id;

    INSERT INTO public.reward_settlement_events (
      sprint_id,
      org_id,
      event_type,
      idempotency_key,
      reason,
      metadata,
      created_by
    )
    VALUES (
      p_sprint_id,
      v_sprint.org_id,
      'kill_switch',
      v_kill_key,
      'duplicate_epoch_distribution_path',
      jsonb_build_object(
        'source', 'commit_sprint_reward_settlement',
        'existing_epoch_rows', v_existing_epoch_count
      ),
      p_actor_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'SETTLEMENT_KILL_SWITCH',
      'status', 'killed',
      'message', 'Duplicate epoch distribution path detected'
    );
  END IF;

  v_rewards_config := COALESCE(v_sprint.org_rewards_config, '{}'::JSONB);

  v_fixed_cap_text := v_rewards_config->>'settlement_fixed_cap_per_sprint';
  IF v_fixed_cap_text IS NOT NULL AND v_fixed_cap_text ~ '^[0-9]+([.][0-9]+)?$' THEN
    v_fixed_cap := v_fixed_cap_text::NUMERIC;
  END IF;
  v_fixed_cap := GREATEST(v_fixed_cap, 0);

  v_emission_percent_text := v_rewards_config->>'settlement_emission_percent';
  IF v_emission_percent_text IS NOT NULL AND v_emission_percent_text ~ '^[0-9]+([.][0-9]+)?$' THEN
    v_emission_percent := v_emission_percent_text::NUMERIC;
  END IF;
  IF v_emission_percent <= 0 OR v_emission_percent > 1 THEN
    v_emission_percent := 0.01;
  END IF;

  v_treasury_balance_text := v_rewards_config->>'treasury_balance_for_emission';
  IF v_treasury_balance_text IS NOT NULL AND v_treasury_balance_text ~ '^[0-9]+([.][0-9]+)?$' THEN
    v_treasury_balance := v_treasury_balance_text::NUMERIC;
  ELSE
    v_treasury_balance := COALESCE(v_sprint.reward_pool, 0);
  END IF;
  v_treasury_balance := GREATEST(v_treasury_balance, 0);

  v_carryover_limit_text := v_rewards_config->>'settlement_carryover_sprint_cap';
  IF v_carryover_limit_text IS NOT NULL AND v_carryover_limit_text ~ '^[0-9]+$' THEN
    v_carryover_limit := v_carryover_limit_text::INTEGER;
  END IF;
  v_carryover_limit := LEAST(3, GREATEST(1, v_carryover_limit));

  SELECT
    COALESCE(s.reward_carryover_amount, 0),
    COALESCE(s.reward_carryover_sprint_count, 0)
  INTO v_prev_carryover, v_prev_streak
  FROM public.sprints s
  WHERE s.id <> p_sprint_id
    AND s.org_id IS NOT DISTINCT FROM v_sprint.org_id
    AND s.reward_settlement_status = 'committed'
  ORDER BY s.completed_at DESC NULLS LAST, s.end_at DESC
  LIMIT 1;

  IF v_prev_streak >= v_carryover_limit THEN
    v_carryover_in := 0;
  ELSE
    v_carryover_in := GREATEST(v_prev_carryover, 0);
  END IF;

  v_emission_base := ROUND(LEAST(v_treasury_balance * v_emission_percent, v_fixed_cap), 9);
  v_emission_cap := ROUND(v_emission_base + v_carryover_in, 9);

  v_reward_pool := COALESCE(v_sprint.reward_pool, 0);
  IF v_reward_pool > 0 THEN
    v_target_pool := ROUND(v_reward_pool, 9);
  ELSE
    v_target_pool := v_emission_cap;
  END IF;

  IF v_target_pool < 0 THEN
    v_hold_reason := 'negative reward pool is not allowed (debt emissions are forbidden)';
  ELSIF v_target_pool > (v_emission_cap + 0.000000001::NUMERIC) THEN
    v_hold_reason := format(
      'reward pool %.9f exceeds emission cap %.9f',
      v_target_pool,
      v_emission_cap
    );
  END IF;

  IF v_hold_reason IS NOT NULL THEN
    v_hold_key := format(
      'reward-settlement-hold:%s:%s',
      p_sprint_id::TEXT,
      md5(v_hold_reason)
    );

    UPDATE public.sprints
    SET
      reward_settlement_status = 'held',
      reward_emission_cap = v_emission_cap,
      settlement_blocked_reason = v_hold_reason,
      settlement_integrity_flags = CASE
        WHEN settlement_integrity_flags IS NULL
          OR jsonb_typeof(settlement_integrity_flags) <> 'array'
          THEN jsonb_build_array(
            jsonb_build_object(
              'code', 'reward_settlement_emission_cap_breach',
              'detected_at', v_now,
              'requested_pool', v_target_pool,
              'emission_cap', v_emission_cap
            )
          )
        ELSE settlement_integrity_flags || jsonb_build_array(
          jsonb_build_object(
            'code', 'reward_settlement_emission_cap_breach',
            'detected_at', v_now,
            'requested_pool', v_target_pool,
            'emission_cap', v_emission_cap
          )
        )
      END
    WHERE id = p_sprint_id;

    INSERT INTO public.reward_settlement_events (
      sprint_id,
      org_id,
      event_type,
      idempotency_key,
      reason,
      metadata,
      created_by
    )
    VALUES (
      p_sprint_id,
      v_sprint.org_id,
      'integrity_hold',
      v_hold_key,
      'emission_cap_breach',
      jsonb_build_object(
        'source', 'commit_sprint_reward_settlement',
        'requested_pool', v_target_pool,
        'emission_cap', v_emission_cap
      ),
      p_actor_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'EMISSION_CAP_BREACH',
      'status', 'held',
      'message', v_hold_reason,
      'requested_pool', v_target_pool,
      'emission_cap', v_emission_cap
    );
  END IF;

  UPDATE public.sprints
  SET
    reward_pool = v_target_pool,
    reward_emission_cap = v_emission_cap,
    reward_settlement_status = 'pending',
    settlement_blocked_reason = NULL
  WHERE id = p_sprint_id;

  PERFORM public.distribute_epoch_rewards(p_sprint_id);

  UPDATE public.reward_distributions
  SET
    idempotency_key = COALESCE(
      idempotency_key,
      format('reward-settlement:%s:%s', p_sprint_id::TEXT, user_id::TEXT)
    ),
    integrity_hold = false,
    integrity_reason = NULL
  WHERE sprint_id = p_sprint_id
    AND type = 'epoch'::distribution_type;

  SELECT COALESCE(COUNT(*), 0)::INTEGER, COALESCE(SUM(token_amount), 0)
  INTO v_dist_count, v_total_distributed
  FROM public.reward_distributions
  WHERE sprint_id = p_sprint_id
    AND type = 'epoch'::distribution_type;

  IF v_total_distributed > (v_target_pool + 0.000000001::NUMERIC) THEN
    UPDATE public.sprints
    SET
      reward_settlement_status = 'killed',
      reward_settlement_kill_switch_at = v_now,
      settlement_blocked_reason = 'distributed tokens exceeded target pool',
      settlement_integrity_flags = CASE
        WHEN settlement_integrity_flags IS NULL
          OR jsonb_typeof(settlement_integrity_flags) <> 'array'
          THEN jsonb_build_array(
            jsonb_build_object(
              'code', 'reward_settlement_overspend_detected',
              'detected_at', v_now,
              'target_pool', v_target_pool,
              'distributed_tokens', v_total_distributed
            )
          )
        ELSE settlement_integrity_flags || jsonb_build_array(
          jsonb_build_object(
            'code', 'reward_settlement_overspend_detected',
            'detected_at', v_now,
            'target_pool', v_target_pool,
            'distributed_tokens', v_total_distributed
          )
        )
      END
    WHERE id = p_sprint_id;

    INSERT INTO public.reward_settlement_events (
      sprint_id,
      org_id,
      event_type,
      idempotency_key,
      reason,
      metadata,
      created_by
    )
    VALUES (
      p_sprint_id,
      v_sprint.org_id,
      'kill_switch',
      v_kill_key,
      'reward_overspend_detected',
      jsonb_build_object(
        'source', 'commit_sprint_reward_settlement',
        'target_pool', v_target_pool,
        'distributed_tokens', v_total_distributed
      ),
      p_actor_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'SETTLEMENT_KILL_SWITCH',
      'status', 'killed',
      'message', 'Distributed tokens exceeded target pool'
    );
  END IF;

  v_carryover_out := ROUND(GREATEST(v_emission_cap - v_total_distributed, 0), 9);
  IF v_carryover_out > 0 THEN
    v_next_streak := LEAST(v_carryover_limit, GREATEST(v_prev_streak, 0) + 1);
  ELSE
    v_next_streak := 0;
  END IF;

  UPDATE public.sprints
  SET
    reward_settlement_status = 'committed',
    reward_settlement_committed_at = v_now,
    reward_settlement_idempotency_key = v_commit_key,
    reward_settlement_kill_switch_at = NULL,
    reward_emission_cap = v_emission_cap,
    reward_carryover_amount = v_carryover_out,
    reward_carryover_sprint_count = v_next_streak,
    settlement_blocked_reason = NULL
  WHERE id = p_sprint_id;

  INSERT INTO public.reward_settlement_events (
    sprint_id,
    org_id,
    event_type,
    idempotency_key,
    reason,
    metadata,
    created_by
  )
  VALUES (
    p_sprint_id,
    v_sprint.org_id,
    'settlement_committed',
    v_commit_key,
    p_reason,
    jsonb_build_object(
      'source', 'commit_sprint_reward_settlement',
      'distributed_count', v_dist_count,
      'distributed_tokens', v_total_distributed,
      'emission_cap', v_emission_cap,
      'carryover_out', v_carryover_out,
      'carryover_streak', v_next_streak
    ),
    p_actor_id
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'SETTLEMENT_COMMITTED',
    'status', 'committed',
    'idempotency_key', v_commit_key,
    'distributed_count', v_dist_count,
    'distributed_tokens', v_total_distributed,
    'emission_cap', v_emission_cap,
    'carryover_out', v_carryover_out,
    'carryover_streak', v_next_streak
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_sprint_reward_settlement(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_sprint_reward_settlement(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_sprint_reward_settlement(UUID, UUID, TEXT) TO service_role;

-- 5) Backfill settlement status for already completed sprints with epoch payouts.
UPDATE public.sprints s
SET
  reward_settlement_status = 'committed',
  reward_settlement_committed_at = COALESCE(s.reward_settlement_committed_at, s.completed_at, NOW()),
  reward_settlement_idempotency_key = COALESCE(
    s.reward_settlement_idempotency_key,
    format('reward-settlement-commit:%s', s.id::TEXT)
  )
WHERE s.reward_settlement_status = 'pending'
  AND s.status = 'completed'
  AND EXISTS (
    SELECT 1
    FROM public.reward_distributions rd
    WHERE rd.sprint_id = s.id
      AND rd.type = 'epoch'::distribution_type
  );
