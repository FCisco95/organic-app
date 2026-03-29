-- Add idempotency key support for reward claims to prevent duplicate submissions.
-- The claims API route already sends/checks this column; this migration adds the
-- backing column and a partial unique index so the DB enforces uniqueness.

ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Partial unique index: enforces uniqueness only when key is provided,
-- allowing existing rows (idempotency_key IS NULL) to coexist without conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_claims_idempotency
  ON reward_claims (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
