export interface TenantSocials {
  x: string | null;
  telegram: string | null;
  discord: string | null;
  youtube: string | null;
  tiktok: string | null;
  website: string | null;
}

export interface TenantBranding {
  communityName: string;
  communityHandle: string | null;
  logoUrl: string;
  heroImageUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  accentPrimary: string;
  accentSecondary: string | null;
  tagline: string | null;
  footerNote: string | null;
  /**
   * True when the tenant *is* Organic itself (the platform). Used to suppress
   * the "Powered by Organic" attribution on the canonical Organic dashboard.
   * For every other tenant this stays false and the attribution renders.
   */
  isPlatformOwner: boolean;
  socials: TenantSocials;
}
