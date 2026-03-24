-- ============================================================================
-- C4: Holding Rewards (Diamond Hands)
-- Tables: wallet_balance_snapshots
-- Periodic on-chain balance check, XP multiplier tiers, achievement chain
-- ============================================================================

-- ─── Wallet Balance Snapshots table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_balance_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  token_balance   NUMERIC(20,9) NOT NULL DEFAULT 0,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One snapshot per user per day
  UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_user_date
  ON wallet_balance_snapshots(user_id, snapshot_date DESC);

-- ─── Holding status tracking ──────────────────────────────────────────
-- Columns on user_profiles for quick lookups

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS holding_start_date DATE,
  ADD COLUMN IF NOT EXISTS holding_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holding_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS min_balance_held NUMERIC(20,9) NOT NULL DEFAULT 0;

-- ─── Activity event types ─────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'holding_sync';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'holding_reward';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE wallet_balance_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can see their own snapshots
CREATE POLICY "snapshots_select_own"
  ON wallet_balance_snapshots FOR SELECT
  USING (user_id = auth.uid());

-- Service role inserts snapshots (via sync job)
-- No user-facing INSERT policy — snapshots are created by the sync endpoint
CREATE POLICY "snapshots_insert_service"
  ON wallet_balance_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());
