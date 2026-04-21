-- Translation admin toggles (Plan: docs/plans/2026-04-21-translation-admin-toggles.md).
--
-- 1. orgs.translation_settings: per-content-type on/off flags. Admins manage
--    this from Settings > Translation tab. Values are read by a public
--    flag endpoint so translate buttons can hide without admin auth.
-- 2. tasks.detected_language: mirrors proposals/ideas/comments. Enables
--    the task translate button to hide when content is already in the
--    user's locale. Indexed the same way as the other content types.

-- ─── 1. orgs.translation_settings ────────────────────────────────────────
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS translation_settings JSONB NOT NULL DEFAULT '{
    "posts": true,
    "proposals": true,
    "ideas": true,
    "tasks": true,
    "comments": false
  }'::jsonb;

COMMENT ON COLUMN orgs.translation_settings IS
  'Per-content-type translation toggles. Admins manage via Settings > Translation. When a flag is false, the translate button hides in the UI and the server-side translate route returns 403.';

-- ─── 2. tasks.detected_language ──────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS detected_language TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_detected_language
  ON tasks (detected_language)
  WHERE detected_language IS NOT NULL;

-- ─── 3. Expand audit event scope to cover translation_settings changes ──
ALTER TABLE public.admin_config_audit_events
  DROP CONSTRAINT IF EXISTS admin_config_audit_events_change_scope_check;

ALTER TABLE public.admin_config_audit_events
  ADD CONSTRAINT admin_config_audit_events_change_scope_check
  CHECK (
    change_scope IN (
      'org', 'voting_config', 'governance_policy', 'sprint_policy', 'rewards_config',
      'user_restriction', 'user_unrestriction', 'user_flag',
      'translation_settings'
    )
  );
