-- ============================================================================
-- Migration: Admin config knobs + append-only config audit events
-- Purpose:
--   - Expand org-level configurable governance/sprint policy knobs
--   - Enforce append-only audit log storage for settings changes
-- ============================================================================

-- 1) Add policy config columns on orgs.
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS governance_policy JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS sprint_policy JSONB NOT NULL DEFAULT '{}'::JSONB;

-- 2) Append-only admin config audit event ledger.
CREATE TABLE IF NOT EXISTS public.admin_config_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  actor_role public.user_role NOT NULL,
  reason TEXT NOT NULL,
  change_scope TEXT NOT NULL CHECK (
    change_scope IN ('org', 'voting_config', 'governance_policy', 'sprint_policy', 'rewards_config')
  ),
  previous_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  new_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_config_audit_events_org_created
  ON public.admin_config_audit_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_config_audit_events_scope_created
  ON public.admin_config_audit_events(change_scope, created_at DESC);

-- 3) Prevent mutation (append-only).
CREATE OR REPLACE FUNCTION public.prevent_admin_config_audit_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_config_audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_config_audit_events_no_update ON public.admin_config_audit_events;
CREATE TRIGGER trg_admin_config_audit_events_no_update
  BEFORE UPDATE ON public.admin_config_audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_config_audit_events_mutation();

DROP TRIGGER IF EXISTS trg_admin_config_audit_events_no_delete ON public.admin_config_audit_events;
CREATE TRIGGER trg_admin_config_audit_events_no_delete
  BEFORE DELETE ON public.admin_config_audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_config_audit_events_mutation();

-- 4) RLS for audit read/insert paths.
ALTER TABLE public.admin_config_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin config audit select admin council" ON public.admin_config_audit_events;
CREATE POLICY "admin config audit select admin council"
  ON public.admin_config_audit_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('admin', 'council')
    )
  );

DROP POLICY IF EXISTS "admin config audit insert admin only" ON public.admin_config_audit_events;
CREATE POLICY "admin config audit insert admin only"
  ON public.admin_config_audit_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'
    )
  );
