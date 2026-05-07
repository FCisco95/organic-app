-- ============================================================================
-- Migration: Archive Easter 2026 campaign data
--
-- Easter campaign shipped Apr 4–5 2026 and wound down Apr 6 (per project
-- history). Today is May 7. The five Easter tables still hold campaign
-- state that is no longer needed for live operation but is worth keeping
-- for analytics / next-year campaign design.
--
-- Strategy:
--   1. Move per-user discovery + reward data to archive.* tables (CREATE
--      TABLE … AS preserves rows + types; no FKs in the archive copy).
--   2. Truncate the live tables so the schema can be reused for a 2027
--      campaign without colliding with stale rows.
--   3. Leave the table schemas in place — re-running the Easter feature
--      next year is cheaper than rebuilding the schema.
--
-- This migration is destructive (TRUNCATE). Apply only after confirming
-- the archive copies are populated correctly. The two CREATE TABLE … AS
-- statements run before the TRUNCATEs, so a failure in archiving will
-- abort the transaction before any data is destroyed.
-- ============================================================================

BEGIN;

-- 1. Archive schema -----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS archive;

-- 2. Snapshot the data worth keeping ------------------------------------------
-- golden_eggs: every user discovery (egg_number, element, found_at)
DROP TABLE IF EXISTS archive.golden_eggs_2026;
CREATE TABLE archive.golden_eggs_2026 AS
  TABLE public.golden_eggs;

-- egg_opens: every XP-to-reward conversion in the egg-opening mini-game
DROP TABLE IF EXISTS archive.egg_opens_2026;
CREATE TABLE archive.egg_opens_2026 AS
  TABLE public.egg_opens;

-- 3. Truncate the live tables -------------------------------------------------
-- egg_hunt_config has one admin-config row; reset to defaults instead of
-- truncating so the gating flags stay false until next year's launch.
UPDATE public.egg_hunt_config
SET
  shimmer_enabled = false,
  hunt_enabled = false,
  campaign_revealed = false,
  probability_override = false,
  override_expires_at = NULL,
  hunt_ends_at = NULL,
  xp_egg_enabled = false,
  updated_at = now();

-- Per-user / per-event state can be cleared. golden_eggs and egg_opens
-- are truncated AFTER the archive copies above succeed.
TRUNCATE TABLE
  public.egg_hunt_luck,
  public.xp_egg_pending,
  public.golden_eggs,
  public.egg_opens
RESTART IDENTITY;

COMMIT;

-- ============================================================================
-- Verification (run manually after apply):
--
--   SELECT count(*) FROM archive.golden_eggs_2026;       -- > 0 if campaign had finds
--   SELECT count(*) FROM archive.egg_opens_2026;         -- >= 0
--   SELECT count(*) FROM public.golden_eggs;             -- 0
--   SELECT count(*) FROM public.egg_opens;               -- 0
--   SELECT count(*) FROM public.egg_hunt_luck;           -- 0
--   SELECT count(*) FROM public.xp_egg_pending;          -- 0
--   SELECT hunt_enabled, shimmer_enabled
--     FROM public.egg_hunt_config;                       -- both false
-- ============================================================================
