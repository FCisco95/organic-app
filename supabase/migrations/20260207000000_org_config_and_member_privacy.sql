-- ===========================================================================
-- Migration: Extend orgs with DAO config + add profile privacy
-- Purpose: DB-driven org config (token, treasury, sprints) for SaaS readiness
--          and member directory privacy controls
-- ===========================================================================

-- 1. Extend orgs table with configurable settings
-- Token config
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS token_symbol TEXT NOT NULL DEFAULT '$ORG',
  ADD COLUMN IF NOT EXISTS token_mint TEXT,
  ADD COLUMN IF NOT EXISTS token_decimals INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS token_total_supply BIGINT NOT NULL DEFAULT 1000000000;

-- Treasury config
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS treasury_wallet TEXT,
  ADD COLUMN IF NOT EXISTS treasury_allocations JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Sprint defaults
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS default_sprint_capacity INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS default_sprint_duration_days INTEGER NOT NULL DEFAULT 14;

-- Organic ID config
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS organic_id_threshold NUMERIC DEFAULT 0;

-- 2. Add profile visibility to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;

-- 3. Seed the initial Organic DAO org with current hardcoded values
INSERT INTO orgs (
  name,
  slug,
  description,
  token_symbol,
  token_mint,
  token_decimals,
  token_total_supply,
  treasury_wallet,
  treasury_allocations,
  default_sprint_capacity,
  default_sprint_duration_days,
  organic_id_threshold
)
VALUES (
  'Organic',
  'organic',
  'Organic DAO Community',
  '$ORG',
  '',
  9,
  1000000000,
  'CuBV7VVq3zSrh1wf5SZCp36JqpFRCGJHvV7he6K8SDJ1',
  '[{"key":"development","percentage":40,"color":"#f97316"},{"key":"community","percentage":25,"color":"#22c55e"},{"key":"operations","percentage":20,"color":"#3b82f6"},{"key":"reserve","percentage":15,"color":"#a855f7"}]'::jsonb,
  100,
  14,
  0
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Link voting_config to the org if not already linked
UPDATE voting_config
SET org_id = (SELECT id FROM orgs WHERE slug = 'organic' LIMIT 1)
WHERE org_id IS NULL;

-- 5. Indexes for member directory queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_visible
  ON user_profiles(profile_visible);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_user_profiles_name
  ON user_profiles(name);

-- 6. Admin policy for updating member roles
-- (admins need to be able to update any profile's role)
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
