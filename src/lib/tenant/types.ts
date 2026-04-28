export interface TenantBranding {
  communityName: string;
  communityHandle: string | null;
  logoUrl: string;
  heroImageUrl: string | null;
  accentPrimary: string;
  accentSecondary: string | null;
  tagline: string | null;
  footerNote: string | null;
  socials: {
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
  };
}
