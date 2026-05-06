import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BRANDING,
  DEFAULT_SOCIALS,
  mergeBrandingWithDefaults,
  type BrandingRow,
} from '../../../src/features/branding/defaults';

describe('mergeBrandingWithDefaults', () => {
  it('returns DEFAULT_BRANDING when row is null', () => {
    expect(mergeBrandingWithDefaults(null)).toEqual(DEFAULT_BRANDING);
  });

  it('returns DEFAULT_BRANDING when row is undefined', () => {
    expect(mergeBrandingWithDefaults(undefined as unknown as null)).toEqual(DEFAULT_BRANDING);
  });

  it('overlays only the populated row fields onto defaults', () => {
    const row: Partial<BrandingRow> = {
      name: 'Acme DAO',
      tagline: 'We ship.',
      logo_url: '/acme.png',
      brand_color_primary: '210 100% 50%',
    };

    const merged = mergeBrandingWithDefaults(row);

    expect(merged.communityName).toBe('Acme DAO');
    expect(merged.tagline).toBe('We ship.');
    expect(merged.logoUrl).toBe('/acme.png');
    expect(merged.accentPrimary).toBe('210 100% 50%');
    // Untouched fields fall through to defaults
    expect(merged.communityHandle).toBe(DEFAULT_BRANDING.communityHandle);
    expect(merged.bannerUrl).toBe(DEFAULT_BRANDING.bannerUrl);
    expect(merged.isPlatformOwner).toBe(DEFAULT_BRANDING.isPlatformOwner);
  });

  it('null fields on the row fall through to defaults (not stored as null)', () => {
    const row: Partial<BrandingRow> = {
      name: 'Acme DAO',
      logo_url: null,
      brand_color_primary: null,
    };

    const merged = mergeBrandingWithDefaults(row);

    expect(merged.logoUrl).toBe(DEFAULT_BRANDING.logoUrl);
    expect(merged.accentPrimary).toBe(DEFAULT_BRANDING.accentPrimary);
  });

  it('builds a complete socials object even when only some platforms are set', () => {
    const row: Partial<BrandingRow> = {
      social_x: 'https://x.com/acme',
      social_telegram: 'https://t.me/acme',
    };

    const merged = mergeBrandingWithDefaults(row);

    expect(merged.socials).toEqual({
      x: 'https://x.com/acme',
      telegram: 'https://t.me/acme',
      discord: null,
      youtube: null,
      tiktok: null,
      website: null,
    });
  });

  it('preserves explicit is_platform_owner=true', () => {
    const row: Partial<BrandingRow> = { is_platform_owner: true };
    expect(mergeBrandingWithDefaults(row).isPlatformOwner).toBe(true);
  });

  it('treats is_platform_owner=null as default false', () => {
    const row: Partial<BrandingRow> = { is_platform_owner: null };
    expect(mergeBrandingWithDefaults(row).isPlatformOwner).toBe(false);
  });
});

describe('DEFAULT_SOCIALS', () => {
  it('has all six platform keys nullable by default', () => {
    expect(DEFAULT_SOCIALS).toEqual({
      x: null,
      telegram: null,
      discord: null,
      youtube: null,
      tiktok: null,
      website: null,
    });
  });
});

describe('DEFAULT_BRANDING', () => {
  it('uses the organic-ux orange ramp anchor as the default accent', () => {
    expect(DEFAULT_BRANDING.accentPrimary).toBe('28 100% 50%');
  });

  it('defaults isPlatformOwner to false (only the canonical Organic row is true)', () => {
    expect(DEFAULT_BRANDING.isPlatformOwner).toBe(false);
  });
});
