-- ===========================================================================
-- Migration: Sprint-bound dispute auto-escalation
-- Purpose:
--   Auto-escalate unresolved disputes when a sprint is closed and extend
--   admin-tier dispute deadlines by 48h.
-- ===========================================================================

CREATE OR REPLACE FUNCTION auto_escalate_sprint_disputes(p_sprint_id UUID)
RETURNS TABLE (
  escalated_count INTEGER,
  admin_extended_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_council_to_admin_count INTEGER := 0;
  v_mediation_to_council_count INTEGER := 0;
  v_admin_extension_count INTEGER := 0;
BEGIN
  -- Escalate unresolved council-tier disputes to admin-tier.
  -- Set status to appealed and clear arbitrator assignment for admin reassignment.
  WITH escalated_council AS (
    UPDATE disputes d
    SET
      tier = 'admin',
      status = 'appealed',
      arbitrator_id = NULL
    WHERE d.sprint_id = p_sprint_id
      AND d.tier = 'council'
      AND d.status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated')
    RETURNING d.id
  )
  SELECT COUNT(*)::INTEGER INTO v_council_to_admin_count FROM escalated_council;

  -- Escalate unresolved mediation-tier disputes to council-tier.
  -- Move these directly to under_review so arbitration can proceed immediately.
  WITH escalated_mediation AS (
    UPDATE disputes d
    SET
      tier = 'council',
      status = 'under_review',
      arbitrator_id = NULL
    WHERE d.sprint_id = p_sprint_id
      AND d.tier = 'mediation'
      AND d.status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated')
    RETURNING d.id
  )
  SELECT COUNT(*)::INTEGER INTO v_mediation_to_council_count FROM escalated_mediation;

  -- Extend unresolved admin-tier disputes by 48h at sprint close.
  WITH extended_admin AS (
    UPDATE disputes d
    SET appeal_deadline =
      GREATEST(COALESCE(d.appeal_deadline, NOW()), NOW()) + INTERVAL '48 hours'
    WHERE d.sprint_id = p_sprint_id
      AND d.tier = 'admin'
      AND d.status NOT IN ('resolved', 'dismissed', 'withdrawn', 'mediated')
    RETURNING d.id
  )
  SELECT COUNT(*)::INTEGER INTO v_admin_extension_count FROM extended_admin;

  RETURN QUERY
  SELECT
    (v_council_to_admin_count + v_mediation_to_council_count)::INTEGER,
    v_admin_extension_count;
END;
$$;
