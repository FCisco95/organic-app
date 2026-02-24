-- Task 2: Voting snapshot and finalization integrity
-- Adds deterministic voter snapshots, transactional voting start, and idempotent finalization.

-- 1) Proposal-level integrity metadata.
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS server_voting_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalization_dedupe_key TEXT,
ADD COLUMN IF NOT EXISTS finalization_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS finalization_last_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalization_failure_reason TEXT,
ADD COLUMN IF NOT EXISTS finalization_frozen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_proposals_server_voting_started_at
  ON public.proposals(server_voting_started_at)
  WHERE server_voting_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_finalization_frozen_at
  ON public.proposals(finalization_frozen_at)
  WHERE finalization_frozen_at IS NOT NULL;

-- 2) Snapshot table with effective voting power per user.
CREATE TABLE IF NOT EXISTS public.proposal_voter_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  own_weight NUMERIC NOT NULL DEFAULT 0,
  delegated_weight NUMERIC NOT NULL DEFAULT 0,
  total_weight NUMERIC NOT NULL DEFAULT 0,
  delegator_count INTEGER NOT NULL DEFAULT 0,
  cycle_broken BOOLEAN NOT NULL DEFAULT FALSE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proposal_voter_snapshots_unique UNIQUE (proposal_id, voter_id),
  CONSTRAINT proposal_voter_snapshots_nonnegative CHECK (
    own_weight >= 0
    AND delegated_weight >= 0
    AND total_weight >= 0
    AND delegator_count >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_proposal_voter_snapshots_proposal_total
  ON public.proposal_voter_snapshots(proposal_id, total_weight DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_voter_snapshots_voter
  ON public.proposal_voter_snapshots(voter_id, proposal_id);

-- 3) Resolve delegated voting target with deterministic cycle-breaking.
CREATE OR REPLACE FUNCTION public.resolve_proposal_snapshot_delegate(
  p_source_user_id UUID,
  p_proposal_category proposal_category
)
RETURNS TABLE (
  resolved_voter_id UUID,
  cycle_broken BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current UUID := p_source_user_id;
  v_next UUID;
  v_seen UUID[] := ARRAY[p_source_user_id];
BEGIN
  LOOP
    SELECT vd.delegate_id
    INTO v_next
    FROM public.vote_delegations vd
    WHERE vd.delegator_id = v_current
      AND (vd.category IS NULL OR vd.category = p_proposal_category)
    ORDER BY
      CASE WHEN vd.category = p_proposal_category THEN 0 ELSE 1 END,
      vd.updated_at DESC,
      vd.created_at DESC,
      vd.id DESC
    LIMIT 1;

    IF v_next IS NULL THEN
      resolved_voter_id := v_current;
      cycle_broken := FALSE;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_next = ANY(v_seen) THEN
      resolved_voter_id := p_source_user_id;
      cycle_broken := TRUE;
      RETURN NEXT;
      RETURN;
    END IF;

    v_seen := array_append(v_seen, v_next);
    v_current := v_next;

    IF cardinality(v_seen) > 32 THEN
      resolved_voter_id := p_source_user_id;
      cycle_broken := TRUE;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

-- 4) Transactional voting start: snapshot commit + deterministic effective power.
CREATE OR REPLACE FUNCTION public.start_proposal_voting_integrity(
  p_proposal_id UUID,
  p_voting_duration_days INTEGER DEFAULT NULL,
  p_snapshot_holders JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role user_role;
  v_now TIMESTAMPTZ := NOW();
  v_duration_days INTEGER;
  v_proposal_status proposal_status;
  v_proposal_category proposal_category;
  v_total_supply NUMERIC := 0;
  v_raw_holder_rows INTEGER := 0;
  v_holder_count INTEGER := 0;
  v_voter_count INTEGER := 0;
  v_linked_wallet_count INTEGER := 0;
  v_quorum_percentage NUMERIC := 5;
  v_approval_threshold NUMERIC := 50;
  v_quorum_required NUMERIC := 0;
  v_resolved_voter UUID;
  v_cycle_broken BOOLEAN;
  v_row RECORD;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'UNAUTHORIZED',
      'message', 'Unauthorized'
    );
  END IF;

  SELECT role INTO v_actor_role
  FROM public.user_profiles
  WHERE id = v_actor_id;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'council') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'FORBIDDEN',
      'message', 'Only admin or council members can start voting'
    );
  END IF;

  IF p_snapshot_holders IS NULL OR jsonb_typeof(p_snapshot_holders) <> 'array' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'INVALID_SNAPSHOT',
      'message', 'Snapshot holders array is required'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('proposal-start-voting:' || p_proposal_id::TEXT));

  SELECT p.status, p.category
  INTO v_proposal_status, v_proposal_category
  FROM public.proposals p
  WHERE p.id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'NOT_FOUND',
      'message', 'Proposal not found'
    );
  END IF;

  IF public.normalize_proposal_status(COALESCE(v_proposal_status, 'draft'::proposal_status))
    NOT IN ('public'::proposal_status, 'qualified'::proposal_status, 'discussion'::proposal_status) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'INVALID_STATUS',
      'message', format('Cannot start voting on a proposal with status %s', COALESCE(v_proposal_status::TEXT, 'null'))
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.holder_snapshots hs
    WHERE hs.proposal_id = p_proposal_id
    LIMIT 1
  ) OR EXISTS (
    SELECT 1
    FROM public.proposal_voter_snapshots pvs
    WHERE pvs.proposal_id = p_proposal_id
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'SNAPSHOT_EXISTS',
      'message', 'Snapshot already taken for this proposal'
    );
  END IF;

  SELECT quorum_percentage, approval_threshold, voting_duration_days
  INTO v_quorum_percentage, v_approval_threshold, v_duration_days
  FROM public.voting_config
  ORDER BY created_at ASC
  LIMIT 1;

  v_duration_days := COALESCE(p_voting_duration_days, v_duration_days, 5);

  IF v_duration_days < 1 OR v_duration_days > 30 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'INVALID_DURATION',
      'message', 'Voting duration must be between 1 and 30 days'
    );
  END IF;

  -- Drop any leftover temp tables from prior calls in the same session
  DROP TABLE IF EXISTS tmp_voter_allocations;
  DROP TABLE IF EXISTS tmp_user_wallet_weights;
  DROP TABLE IF EXISTS tmp_snapshot_holders_agg;
  DROP TABLE IF EXISTS tmp_snapshot_holders;

  CREATE TEMP TABLE tmp_snapshot_holders (
    wallet_pubkey TEXT NOT NULL,
    balance_ui NUMERIC NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_snapshot_holders (wallet_pubkey, balance_ui)
  SELECT
    COALESCE(NULLIF(BTRIM(h.wallet_pubkey), ''), NULLIF(BTRIM(h.address), '')) AS wallet_pubkey,
    COALESCE(h.balance_ui, h.balance, 0)::NUMERIC AS balance_ui
  FROM jsonb_to_recordset(p_snapshot_holders) AS h(
    address TEXT,
    wallet_pubkey TEXT,
    balance NUMERIC,
    balance_ui NUMERIC
  )
  WHERE COALESCE(h.balance_ui, h.balance, 0) > 0
    AND COALESCE(NULLIF(BTRIM(h.wallet_pubkey), ''), NULLIF(BTRIM(h.address), '')) IS NOT NULL;

  SELECT COUNT(*)
  INTO v_raw_holder_rows
  FROM tmp_snapshot_holders;

  CREATE TEMP TABLE tmp_snapshot_holders_agg ON COMMIT DROP AS
  SELECT wallet_pubkey, SUM(balance_ui)::NUMERIC AS balance_ui
  FROM tmp_snapshot_holders
  GROUP BY wallet_pubkey;

  SELECT COUNT(*), COALESCE(SUM(balance_ui), 0)
  INTO v_holder_count, v_total_supply
  FROM tmp_snapshot_holders_agg;

  IF v_holder_count = 0 OR v_total_supply <= 0 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'EMPTY_SNAPSHOT',
      'message', 'No token holders found. Cannot start voting.'
    );
  END IF;

  INSERT INTO public.holder_snapshots (
    proposal_id,
    wallet_pubkey,
    balance_ui,
    taken_at
  )
  SELECT
    p_proposal_id,
    h.wallet_pubkey,
    h.balance_ui,
    v_now
  FROM tmp_snapshot_holders_agg h;

  CREATE TEMP TABLE tmp_user_wallet_weights ON COMMIT DROP AS
  SELECT
    up.id AS user_id,
    SUM(h.balance_ui)::NUMERIC AS own_weight
  FROM public.user_profiles up
  JOIN tmp_snapshot_holders_agg h
    ON h.wallet_pubkey = up.wallet_pubkey
  WHERE h.balance_ui >= 1 -- Per-wallet minimum voting threshold.
  GROUP BY up.id;

  SELECT COUNT(*)
  INTO v_linked_wallet_count
  FROM tmp_user_wallet_weights;

  CREATE TEMP TABLE tmp_voter_allocations (
    source_user_id UUID NOT NULL,
    recipient_user_id UUID NOT NULL,
    weight NUMERIC NOT NULL,
    cycle_broken BOOLEAN NOT NULL DEFAULT FALSE
  ) ON COMMIT DROP;

  FOR v_row IN
    SELECT user_id, own_weight
    FROM tmp_user_wallet_weights
    WHERE own_weight > 0
  LOOP
    SELECT d.resolved_voter_id, d.cycle_broken
    INTO v_resolved_voter, v_cycle_broken
    FROM public.resolve_proposal_snapshot_delegate(v_row.user_id, v_proposal_category) d;

    INSERT INTO tmp_voter_allocations (
      source_user_id,
      recipient_user_id,
      weight,
      cycle_broken
    )
    VALUES (
      v_row.user_id,
      COALESCE(v_resolved_voter, v_row.user_id),
      v_row.own_weight,
      COALESCE(v_cycle_broken, FALSE)
    );
  END LOOP;

  INSERT INTO public.proposal_voter_snapshots (
    proposal_id,
    voter_id,
    own_weight,
    delegated_weight,
    total_weight,
    delegator_count,
    cycle_broken,
    taken_at
  )
  SELECT
    p_proposal_id,
    a.recipient_user_id,
    COALESCE(SUM(a.weight) FILTER (WHERE a.source_user_id = a.recipient_user_id), 0)::NUMERIC AS own_weight,
    COALESCE(SUM(a.weight) FILTER (WHERE a.source_user_id <> a.recipient_user_id), 0)::NUMERIC AS delegated_weight,
    COALESCE(SUM(a.weight), 0)::NUMERIC AS total_weight,
    COUNT(*) FILTER (WHERE a.source_user_id <> a.recipient_user_id)::INTEGER AS delegator_count,
    BOOL_OR(a.cycle_broken) AS cycle_broken,
    v_now
  FROM tmp_voter_allocations a
  GROUP BY a.recipient_user_id
  HAVING COALESCE(SUM(a.weight), 0) > 0;

  SELECT COUNT(*)
  INTO v_voter_count
  FROM public.proposal_voter_snapshots pvs
  WHERE pvs.proposal_id = p_proposal_id;

  IF v_raw_holder_rows <> v_holder_count OR v_linked_wallet_count < v_holder_count THEN
    INSERT INTO public.proposal_stage_events (
      proposal_id,
      from_status,
      to_status,
      actor_id,
      reason,
      metadata
    )
    VALUES (
      p_proposal_id,
      v_proposal_status,
      COALESCE(v_proposal_status, 'draft'::proposal_status),
      v_actor_id,
      'snapshot_discrepancy_detected',
      jsonb_build_object(
        'source', 'start_proposal_voting_integrity',
        'raw_holder_rows', v_raw_holder_rows,
        'deduped_holder_rows', v_holder_count,
        'linked_wallet_rows', v_linked_wallet_count
      )
    );
  END IF;

  v_quorum_required := (v_total_supply * COALESCE(v_quorum_percentage, 5)) / 100;

  UPDATE public.proposals
  SET
    status = 'voting',
    voting_starts_at = v_now,
    server_voting_started_at = v_now,
    voting_ends_at = v_now + make_interval(days => v_duration_days),
    snapshot_taken_at = v_now,
    total_circulating_supply = v_total_supply,
    quorum_required = v_quorum_required,
    approval_threshold = COALESCE(v_approval_threshold, 50),
    result = NULL,
    finalization_dedupe_key = NULL,
    finalization_attempts = 0,
    finalization_last_attempt_at = NULL,
    finalization_failure_reason = NULL,
    finalization_frozen_at = NULL,
    updated_at = v_now
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'SNAPSHOT_COMMITTED',
    'message', 'Voting started successfully',
    'proposal_id', p_proposal_id,
    'voting_starts_at', v_now,
    'voting_ends_at', v_now + make_interval(days => v_duration_days),
    'snapshot', jsonb_build_object(
      'holders_count', v_holder_count,
      'voters_count', v_voter_count,
      'total_supply', v_total_supply,
      'quorum_required', v_quorum_required,
      'approval_threshold', COALESCE(v_approval_threshold, 50)
    )
  );
END;
$$;

-- 5) Idempotent finalize with lock + retry + proposal kill-switch freeze.
CREATE OR REPLACE FUNCTION public.finalize_proposal_voting_integrity(
  p_proposal_id UUID,
  p_force BOOLEAN DEFAULT FALSE,
  p_dedupe_key TEXT DEFAULT NULL,
  p_test_fail_mode TEXT DEFAULT 'none'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role user_role;
  v_now TIMESTAMPTZ := NOW();
  v_status proposal_status;
  v_normalized_status proposal_status;
  v_result TEXT;
  v_existing_result TEXT;
  v_voting_ends_at TIMESTAMPTZ;
  v_total_supply NUMERIC := 0;
  v_quorum_required NUMERIC := 0;
  v_approval_threshold NUMERIC := 50;
  v_abstain_counts_toward_quorum BOOLEAN := TRUE;
  v_yes_votes NUMERIC := 0;
  v_no_votes NUMERIC := 0;
  v_abstain_votes NUMERIC := 0;
  v_total_votes NUMERIC := 0;
  v_quorum_votes NUMERIC := 0;
  v_yes_no_votes NUMERIC := 0;
  v_yes_percentage NUMERIC := 0;
  v_quorum_met BOOLEAN := FALSE;
  v_dedupe_key TEXT;
  v_existing_dedupe_key TEXT;
  v_attempt_count INTEGER := 0;
  v_try INTEGER;
  v_error TEXT;
  v_success BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'UNAUTHORIZED',
      'message', 'Unauthorized'
    );
  END IF;

  SELECT role INTO v_actor_role
  FROM public.user_profiles
  WHERE id = v_actor_id;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'council') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'FORBIDDEN',
      'message', 'Only admin or council members can finalize voting'
    );
  END IF;

  IF p_test_fail_mode NOT IN ('none', 'once', 'always') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'INVALID_TEST_FAIL_MODE',
      'message', 'Invalid test fail mode'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('proposal-finalize:' || p_proposal_id::TEXT));

  SELECT
    p.status,
    p.result,
    p.voting_ends_at,
    COALESCE(p.total_circulating_supply, 0),
    COALESCE(p.quorum_required, 0),
    COALESCE(p.approval_threshold, 50),
    p.finalization_dedupe_key,
    COALESCE(p.finalization_attempts, 0)
  INTO
    v_status,
    v_existing_result,
    v_voting_ends_at,
    v_total_supply,
    v_quorum_required,
    v_approval_threshold,
    v_existing_dedupe_key,
    v_attempt_count
  FROM public.proposals p
  WHERE p.id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'NOT_FOUND',
      'message', 'Proposal not found'
    );
  END IF;

  v_normalized_status := public.normalize_proposal_status(COALESCE(v_status, 'draft'::proposal_status));

  IF v_normalized_status = 'finalized'::proposal_status AND v_existing_result IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'code', 'ALREADY_FINALIZED',
      'already_finalized', TRUE,
      'proposal_id', p_proposal_id,
      'status', 'finalized',
      'result', v_existing_result,
      'dedupe_key', COALESCE(v_existing_dedupe_key, p_dedupe_key, format('proposal:%s:finalize', p_proposal_id::TEXT)),
      'attempt_count', v_attempt_count
    );
  END IF;

  IF v_normalized_status <> 'voting'::proposal_status THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'INVALID_STATUS',
      'message', format('Cannot finalize a proposal with status %s', COALESCE(v_status::TEXT, 'null'))
    );
  END IF;

  IF (NOT p_force) AND v_voting_ends_at IS NOT NULL AND v_now < v_voting_ends_at THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'VOTING_NOT_ENDED',
      'message', 'Voting period has not ended yet. Set force=true to finalize early.',
      'voting_ends_at', v_voting_ends_at
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.proposals p
    WHERE p.id = p_proposal_id
      AND p.finalization_frozen_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'FINALIZATION_FROZEN',
      'message', 'Proposal finalization is frozen and requires manual resume',
      'proposal_id', p_proposal_id,
      'dedupe_key', COALESCE(v_existing_dedupe_key, p_dedupe_key, format('proposal:%s:finalize', p_proposal_id::TEXT)),
      'attempt_count', v_attempt_count
    );
  END IF;

  v_dedupe_key := COALESCE(NULLIF(BTRIM(p_dedupe_key), ''), format('proposal:%s:finalize', p_proposal_id::TEXT));

  IF v_existing_dedupe_key IS NOT NULL AND v_existing_dedupe_key <> v_dedupe_key THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'DEDUPE_KEY_MISMATCH',
      'message', 'A different dedupe key was already used for this proposal finalization',
      'proposal_id', p_proposal_id,
      'existing_dedupe_key', v_existing_dedupe_key,
      'requested_dedupe_key', v_dedupe_key
    );
  END IF;

  UPDATE public.proposals
  SET
    finalization_dedupe_key = COALESCE(finalization_dedupe_key, v_dedupe_key),
    updated_at = v_now
  WHERE id = p_proposal_id;

  SELECT abstain_counts_toward_quorum
  INTO v_abstain_counts_toward_quorum
  FROM public.voting_config
  ORDER BY created_at ASC
  LIMIT 1;

  FOR v_try IN 1..2 LOOP
    UPDATE public.proposals
    SET
      finalization_attempts = COALESCE(finalization_attempts, 0) + 1,
      finalization_last_attempt_at = v_now,
      finalization_failure_reason = NULL,
      updated_at = v_now
    WHERE id = p_proposal_id
    RETURNING finalization_attempts INTO v_attempt_count;

    BEGIN
      SELECT
        COALESCE(t.yes_votes, 0),
        COALESCE(t.no_votes, 0),
        COALESCE(t.abstain_votes, 0),
        COALESCE(t.total_votes, 0)
      INTO
        v_yes_votes,
        v_no_votes,
        v_abstain_votes,
        v_total_votes
      FROM public.get_proposal_vote_tally(p_proposal_id) t;

      v_quorum_votes := CASE
        WHEN COALESCE(v_abstain_counts_toward_quorum, TRUE) THEN v_total_votes
        ELSE v_yes_votes + v_no_votes
      END;

      v_quorum_met := v_quorum_votes >= v_quorum_required;

      IF NOT v_quorum_met THEN
        v_result := 'quorum_not_met';
      ELSE
        v_yes_no_votes := v_yes_votes + v_no_votes;
        IF v_yes_no_votes <= 0 THEN
          v_result := 'quorum_not_met';
        ELSE
          v_yes_percentage := (v_yes_votes / v_yes_no_votes) * 100;
          IF v_yes_percentage >= v_approval_threshold THEN
            v_result := 'passed';
          ELSE
            v_result := 'failed';
          END IF;
        END IF;
      END IF;

      IF p_test_fail_mode = 'always' OR (p_test_fail_mode = 'once' AND v_try = 1) THEN
        RAISE EXCEPTION 'Simulated finalization failure after tally';
      END IF;

      UPDATE public.proposals
      SET
        status = 'finalized',
        result = v_result,
        finalized_at = COALESCE(finalized_at, v_now),
        finalization_failure_reason = NULL,
        finalization_frozen_at = NULL,
        updated_at = v_now
      WHERE id = p_proposal_id;

      v_success := TRUE;
      EXIT;
    EXCEPTION
      WHEN OTHERS THEN
        v_error := SQLERRM;

        UPDATE public.proposals
        SET
          finalization_failure_reason = v_error,
          updated_at = v_now
        WHERE id = p_proposal_id;

        IF v_try = 2 THEN
          UPDATE public.proposals
          SET
            finalization_frozen_at = v_now,
            updated_at = v_now
          WHERE id = p_proposal_id;

          INSERT INTO public.proposal_stage_events (
            proposal_id,
            from_status,
            to_status,
            actor_id,
            reason,
            metadata
          )
          VALUES (
            p_proposal_id,
            v_status,
            v_status,
            v_actor_id,
            'finalization_kill_switch',
            jsonb_build_object(
              'source', 'finalize_proposal_voting_integrity',
              'dedupe_key', v_dedupe_key,
              'attempt_count', v_attempt_count,
              'error', v_error
            )
          );
        END IF;
    END;
  END LOOP;

  IF NOT v_success THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'FINALIZATION_FROZEN',
      'message', 'Finalization failed twice and proposal is frozen',
      'proposal_id', p_proposal_id,
      'status', v_status,
      'dedupe_key', v_dedupe_key,
      'attempt_count', v_attempt_count,
      'error', v_error
    );
  END IF;

  v_quorum_votes := CASE
    WHEN COALESCE(v_abstain_counts_toward_quorum, TRUE) THEN v_total_votes
    ELSE v_yes_votes + v_no_votes
  END;

  v_yes_no_votes := v_yes_votes + v_no_votes;
  v_yes_percentage := CASE WHEN v_yes_no_votes > 0 THEN (v_yes_votes / v_yes_no_votes) * 100 ELSE 0 END;
  v_quorum_met := v_quorum_votes >= v_quorum_required;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'FINALIZED',
    'already_finalized', FALSE,
    'proposal_id', p_proposal_id,
    'status', 'finalized',
    'result', v_result,
    'dedupe_key', v_dedupe_key,
    'attempt_count', v_attempt_count,
    'summary', jsonb_build_object(
      'yes_votes', v_yes_votes,
      'no_votes', v_no_votes,
      'abstain_votes', v_abstain_votes,
      'total_votes', v_total_votes,
      'quorum_required', v_quorum_required,
      'quorum_met', v_quorum_met,
      'quorum_percentage', CASE WHEN v_total_supply > 0 THEN (v_quorum_votes / v_total_supply) * 100 ELSE 0 END,
      'yes_percentage', v_yes_percentage,
      'approval_threshold', v_approval_threshold,
      'participation_percentage', CASE WHEN v_total_supply > 0 THEN (v_total_votes / v_total_supply) * 100 ELSE 0 END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_proposal_snapshot_delegate(UUID, proposal_category) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_proposal_snapshot_delegate(UUID, proposal_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_proposal_snapshot_delegate(UUID, proposal_category) TO service_role;

REVOKE ALL ON FUNCTION public.start_proposal_voting_integrity(UUID, INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_proposal_voting_integrity(UUID, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_proposal_voting_integrity(UUID, INTEGER, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_proposal_voting_integrity(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_proposal_voting_integrity(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_proposal_voting_integrity(UUID, BOOLEAN, TEXT, TEXT) TO service_role;
