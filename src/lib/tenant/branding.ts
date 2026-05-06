import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_BRANDING,
  mergeBrandingWithDefaults,
  type BrandingRow,
} from '@/features/branding/defaults';
import type { TenantBranding } from './types';

let brandingCache: { data: TenantBranding; timestamp: number } | null = null;
const BRANDING_TTL = 60_000; // 60s, matches getOrgConfig pattern

/**
 * Fetch the canonical tenant branding from the `orgs` table. Returns
 * `DEFAULT_BRANDING` on error or when no row exists. Multi-tenant routing
 * (per-slug branding) is a separate Phase — this currently reads the first
 * row, which is the platform-owned Organic org.
 */
export async function getBranding(): Promise<TenantBranding> {
  const now = Date.now();
  if (brandingCache && now - brandingCache.timestamp < BRANDING_TTL) {
    return brandingCache.data;
  }

  try {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from('orgs')
      .select(
        [
          'name',
          'community_handle',
          'tagline',
          'logo_url',
          'banner_url',
          'favicon_url',
          'og_image_url',
          'brand_color_primary',
          'brand_color_secondary',
          'footer_note',
          'is_platform_owner',
          'social_x',
          'social_telegram',
          'social_discord',
          'social_youtube',
          'social_tiktok',
          'social_website',
        ].join(','),
      )
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<BrandingRow>();

    const merged = mergeBrandingWithDefaults(row ?? null);
    brandingCache = { data: merged, timestamp: now };
    return merged;
  } catch {
    // DB outage / RLS error — fall back to defaults so the dashboard still renders.
    return DEFAULT_BRANDING;
  }
}

/**
 * Test/dev hook to reset the in-memory cache between requests.
 */
export function __resetBrandingCacheForTests(): void {
  brandingCache = null;
}
