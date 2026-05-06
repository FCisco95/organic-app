-- ===========================================================================
-- Migration: Tenant branding columns on orgs
-- Purpose: Migrate static ORGANIC_BRANDING into DB so each tenant org can
--          configure its identity, visuals, and social URLs from the admin
--          panel (Phase 2). All fields nullable; loader layers DEFAULT_BRANDING
--          fallback in application code.
-- ===========================================================================

-- 1. Identity + visuals
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS community_handle TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color_primary TEXT,
  ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT,
  ADD COLUMN IF NOT EXISTS footer_note TEXT,
  ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN NOT NULL DEFAULT false;

-- 2. Social URLs (full URLs, not handles — simpler validation, future-proof)
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS social_x TEXT,
  ADD COLUMN IF NOT EXISTS social_telegram TEXT,
  ADD COLUMN IF NOT EXISTS social_discord TEXT,
  ADD COLUMN IF NOT EXISTS social_youtube TEXT,
  ADD COLUMN IF NOT EXISTS social_tiktok TEXT,
  ADD COLUMN IF NOT EXISTS social_website TEXT;

-- 3. Backfill the canonical Organic row with values from the static
--    ORGANIC_BRANDING constant (src/lib/tenant/branding.ts).
UPDATE orgs
SET
  community_handle = COALESCE(community_handle, '@organic_bonk'),
  tagline = COALESCE(tagline, 'A community building, governing, rewarding — together.'),
  logo_url = COALESCE(logo_url, '/organic-logo.png'),
  brand_color_primary = COALESCE(brand_color_primary, '28 100% 50%'),
  brand_color_secondary = COALESCE(brand_color_secondary, '60 100% 60%'),
  is_platform_owner = true,
  social_x = COALESCE(social_x, 'https://x.com/organic_bonk')
WHERE slug = 'organic';

-- ─── Rollback notes ──────────────────────────────────────────────────────────
-- To revert:
--   ALTER TABLE orgs
--     DROP COLUMN IF EXISTS community_handle,
--     DROP COLUMN IF EXISTS tagline,
--     DROP COLUMN IF EXISTS logo_url,
--     DROP COLUMN IF EXISTS banner_url,
--     DROP COLUMN IF EXISTS favicon_url,
--     DROP COLUMN IF EXISTS og_image_url,
--     DROP COLUMN IF EXISTS brand_color_primary,
--     DROP COLUMN IF EXISTS brand_color_secondary,
--     DROP COLUMN IF EXISTS footer_note,
--     DROP COLUMN IF EXISTS is_platform_owner,
--     DROP COLUMN IF EXISTS social_x,
--     DROP COLUMN IF EXISTS social_telegram,
--     DROP COLUMN IF EXISTS social_discord,
--     DROP COLUMN IF EXISTS social_youtube,
--     DROP COLUMN IF EXISTS social_tiktok,
--     DROP COLUMN IF EXISTS social_website;
