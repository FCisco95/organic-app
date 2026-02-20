-- ============================================================================
-- Migration: Hotfix reward settlement lock on LEFT JOIN
-- Purpose:
--   - Fix commit_sprint_reward_settlement() to lock only sprints row
--     (`FOR UPDATE OF s`) and avoid Postgres 0A000 on nullable join side.
-- ============================================================================

DO $$
DECLARE
  v_function_definition TEXT;
BEGIN
  BEGIN
    SELECT pg_get_functiondef(
      'public.commit_sprint_reward_settlement(uuid, uuid, text)'::regprocedure
    )
    INTO v_function_definition;
  EXCEPTION
    WHEN undefined_function THEN
      RAISE EXCEPTION
        'Function public.commit_sprint_reward_settlement(uuid, uuid, text) not found';
  END;

  IF v_function_definition IS NULL THEN
    RAISE EXCEPTION
      'Unable to load definition for public.commit_sprint_reward_settlement(uuid, uuid, text)';
  END IF;

  IF position('FOR UPDATE OF s;' IN v_function_definition) > 0 THEN
    RETURN;
  END IF;

  IF position('FOR UPDATE;' IN v_function_definition) = 0 THEN
    RAISE EXCEPTION
      'Expected FOR UPDATE clause not found in commit_sprint_reward_settlement(); manual review required';
  END IF;

  v_function_definition :=
    replace(v_function_definition, 'FOR UPDATE;', 'FOR UPDATE OF s;');

  EXECUTE v_function_definition;
END;
$$;
