import type { TenantBranding } from './types';

const ORGANIC_BRANDING: TenantBranding = {
  communityName: 'Organic',
  communityHandle: '@organic_bonk',
  logoUrl: '/organic-logo.png',
  heroImageUrl: null,
  accentPrimary: '28 100% 50%',
  accentSecondary: '60 100% 60%',
  tagline: 'A community building, governing, rewarding — together.',
  footerNote: null,
  socials: {
    twitter: 'https://x.com/organic_bonk',
    telegram: null,
    discord: null,
  },
};

export async function getBranding(): Promise<TenantBranding> {
  return ORGANIC_BRANDING;
}
