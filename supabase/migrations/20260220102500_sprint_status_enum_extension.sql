-- Extend the sprint_status enum with phase-engine values. Split out of
-- 20260220103000_sprint_phase_engine.sql because Postgres forbids using a
-- newly-added enum value in the same transaction (SQLSTATE 55P04). The
-- phase-engine migration uses these values in a partial-index predicate
-- and function bodies, so they must commit first.
--
-- Idempotent: ADD VALUE IF NOT EXISTS — no-op on prod where these already
-- exist from the original migration.

ALTER TYPE public.sprint_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.sprint_status ADD VALUE IF NOT EXISTS 'dispute_window';
ALTER TYPE public.sprint_status ADD VALUE IF NOT EXISTS 'settlement';
