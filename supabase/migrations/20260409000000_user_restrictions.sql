-- ============================================================================
-- Migration: User restriction system for moderation
-- Purpose:
--   - Add restriction status, reason, and audit fields to user_profiles
--   - Add flagged column for auto-detection surfacing
--   - Extend audit event scope to include moderation actions
-- ============================================================================

-- 1) Add restriction columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS restriction_status TEXT NOT NULL DEFAULT 'active'
    CHECK (restriction_status IN ('active', 'warned', 'restricted', 'banned')),
  ADD COLUMN IF NOT EXISTS restriction_reason TEXT,
  ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restricted_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Index for admin queries filtering by restriction status
CREATE INDEX IF NOT EXISTS idx_user_profiles_restriction_status
  ON public.user_profiles(restriction_status)
  WHERE restriction_status != 'active';

-- 3) Index for flagged users
CREATE INDEX IF NOT EXISTS idx_user_profiles_flagged
  ON public.user_profiles(flagged)
  WHERE flagged = TRUE;

-- 4) Expand audit event scope to include moderation actions
ALTER TABLE public.admin_config_audit_events
  DROP CONSTRAINT IF EXISTS admin_config_audit_events_change_scope_check;

ALTER TABLE public.admin_config_audit_events
  ADD CONSTRAINT admin_config_audit_events_change_scope_check
  CHECK (
    change_scope IN (
      'org', 'voting_config', 'governance_policy', 'sprint_policy', 'rewards_config',
      'user_restriction', 'user_unrestriction', 'user_flag'
    )
  );
