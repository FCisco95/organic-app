-- Task: Proposal execution-window write hardening
-- Adds an RPC that applies execution window metadata inside Postgres so API
-- routes avoid direct column writes through PostgREST schema cache.

CREATE OR REPLACE FUNCTION public.apply_proposal_execution_window(
  p_proposal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role user_role;
  v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_now TIMESTAMPTZ := NOW();
  v_status proposal_status;
  v_result TEXT;
  v_window_days INTEGER := 7;
  v_deadline TIMESTAMPTZ;
  v_rows_updated INTEGER := 0;
BEGIN
  IF v_jwt_role <> 'service_role' THEN
    IF v_actor_id IS NULL THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'UNAUTHORIZED',
        'message', 'Unauthorized'
      );
    END IF;

    SELECT role
    INTO v_actor_role
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'council') THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'FORBIDDEN',
        'message', 'Only admin or council members can apply execution windows'
      );
    END IF;
  END IF;

  SELECT p.status, p.result
  INTO v_status, v_result
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

  IF public.normalize_proposal_status(COALESCE(v_status, 'draft'::proposal_status))
    <> 'finalized'::proposal_status OR v_result <> 'passed' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'NOT_ELIGIBLE',
      'message', 'Execution window applies only to finalized passed proposals',
      'status', COALESCE(v_status::TEXT, 'null'),
      'result', COALESCE(v_result, 'null')
    );
  END IF;

  SELECT execution_window_days
  INTO v_window_days
  FROM public.voting_config
  ORDER BY created_at ASC
  LIMIT 1;

  v_window_days := LEAST(GREATEST(COALESCE(v_window_days, 7), 1), 30);
  v_deadline := v_now + make_interval(days => v_window_days);

  UPDATE public.proposals
  SET
    execution_status = 'pending_execution',
    execution_deadline = v_deadline,
    updated_at = v_now
  WHERE id = p_proposal_id
    AND COALESCE(execution_status, '') <> 'executed';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', CASE WHEN v_rows_updated = 0 THEN 'NOOP' ELSE 'APPLIED' END,
    'proposal_id', p_proposal_id,
    'execution_status', 'pending_execution',
    'execution_deadline', v_deadline,
    'window_days', v_window_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_proposal_execution_window(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_proposal_execution_window(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_proposal_execution_window(UUID) TO service_role;
