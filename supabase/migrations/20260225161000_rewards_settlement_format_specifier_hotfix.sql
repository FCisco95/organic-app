-- ============================================================================
-- Migration: Hotfix reward settlement hold message format specifier
-- Purpose:
--   - Fix commit_sprint_reward_settlement() when deployed with invalid
--     PostgreSQL format() specifiers ('%.9f').
--   - Replace with supported '%s' placeholders.
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

  IF position('reward pool %s exceeds emission cap %s' IN v_function_definition) > 0 THEN
    RETURN;
  END IF;

  IF position('reward pool %.9f exceeds emission cap %.9f' IN v_function_definition) = 0 THEN
    RAISE EXCEPTION
      'Expected legacy format specifier string not found in commit_sprint_reward_settlement(); manual review required';
  END IF;

  v_function_definition := replace(
    v_function_definition,
    'reward pool %.9f exceeds emission cap %.9f',
    'reward pool %s exceeds emission cap %s'
  );

  EXECUTE v_function_definition;
END;
$$;
