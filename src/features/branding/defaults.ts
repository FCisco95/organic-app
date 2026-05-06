import type { TenantBranding, TenantSocials } from '@/lib/tenant/types';

/**
 * Last-resort fallback values used when the DB row is missing fields. The
 * loader in `src/lib/tenant/branding.ts` layers these defaults underneath the
 * tenant's persisted values so a brand-new org with only `slug` + `name` set
 * still renders a coherent dashboard.
 *
 * Keep this file presentation-pure: no DB or network calls.
 */

export const DEFAULT_SOCIALS: TenantSocials = {
  x: null,
  telegram: null,
  discord: null,
  youtube: null,
  tiktok: null,
  website: null,
};

/**
 * Defaults used when a tenant has no branding configured yet. Identicon /
 * dynamic OG image generation is layered on top by the consumers when the
 * tenant has no `logoUrl` or `ogImageUrl` set.
 */
export const DEFAULT_BRANDING: TenantBranding = {
  communityName: 'Community',
  communityHandle: null,
  logoUrl: '/organic-logo.png',
  heroImageUrl: null,
  bannerUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
  // Organic-ux orange ramp anchor (HSL).
  accentPrimary: '28 100% 50%',
  accentSecondary: '60 100% 60%',
  tagline: null,
  footerNote: null,
  isPlatformOwner: false,
  socials: DEFAULT_SOCIALS,
};

/**
 * Shape of the branding row read from `orgs`. Everything optional/nullable —
 * matches the migration in `20260506000000_tenant_branding.sql`.
 */
export interface BrandingRow {
  name: string | null;
  community_handle: string | null;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  brand_color_primary: string | null;
  brand_color_secondary: string | null;
  footer_note: string | null;
  is_platform_owner: boolean | null;
  social_x: string | null;
  social_telegram: string | null;
  social_discord: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  social_website: string | null;
}

/**
 * Layer a partial branding row on top of `DEFAULT_BRANDING`. Null/undefined
 * values fall through to the default. Pure function — testable.
 */
export function mergeBrandingWithDefaults(row: Partial<BrandingRow> | null): TenantBranding {
  if (!row) return DEFAULT_BRANDING;

  return {
    communityName: row.name ?? DEFAULT_BRANDING.communityName,
    communityHandle: row.community_handle ?? DEFAULT_BRANDING.communityHandle,
    logoUrl: row.logo_url ?? DEFAULT_BRANDING.logoUrl,
    heroImageUrl: DEFAULT_BRANDING.heroImageUrl,
    bannerUrl: row.banner_url ?? DEFAULT_BRANDING.bannerUrl,
    faviconUrl: row.favicon_url ?? DEFAULT_BRANDING.faviconUrl,
    ogImageUrl: row.og_image_url ?? DEFAULT_BRANDING.ogImageUrl,
    accentPrimary: row.brand_color_primary ?? DEFAULT_BRANDING.accentPrimary,
    accentSecondary: row.brand_color_secondary ?? DEFAULT_BRANDING.accentSecondary,
    tagline: row.tagline ?? DEFAULT_BRANDING.tagline,
    footerNote: row.footer_note ?? DEFAULT_BRANDING.footerNote,
    isPlatformOwner: row.is_platform_owner ?? DEFAULT_BRANDING.isPlatformOwner,
    socials: {
      x: row.social_x ?? DEFAULT_SOCIALS.x,
      telegram: row.social_telegram ?? DEFAULT_SOCIALS.telegram,
      discord: row.social_discord ?? DEFAULT_SOCIALS.discord,
      youtube: row.social_youtube ?? DEFAULT_SOCIALS.youtube,
      tiktok: row.social_tiktok ?? DEFAULT_SOCIALS.tiktok,
      website: row.social_website ?? DEFAULT_SOCIALS.website,
    },
  };
}
