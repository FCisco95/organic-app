-- ===========================================================================
-- Migration: Dispute dismissed cooldown config
-- Purpose:
--   Add a dedicated cooldown window after dismissed disputes so frivolous
--   disputes are rate-limited longer than the standard dispute cooldown.
-- ===========================================================================

UPDATE orgs
SET gamification_config = gamification_config || '{
  "dispute_dismissed_cooldown_days": 14
}'::jsonb
WHERE NOT gamification_config ? 'dispute_dismissed_cooldown_days';
