-- Extend the proposal_status enum with lifecycle states. Split out of
-- 20260220090000_proposal_stage_engine.sql because Postgres forbids using
-- a newly-added enum value in the same transaction — the stage-engine
-- migration uses these values in function bodies immediately, which fails
-- against a fresh Supabase unless the ADD VALUE runs in its own transaction.
--
-- Idempotent: ADD VALUE IF NOT EXISTS is a no-op when the value exists
-- (prod already has all five from the original migration).

ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'public';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'qualified';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'discussion';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'finalized';
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'canceled';
