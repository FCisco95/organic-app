import { describe, it, expect } from 'vitest';
import {
  brandingFieldsSchema,
  brandingPatchSchema,
} from '../../src/features/branding/schemas';

/**
 * Security tests for the branding schema. The branding fields are submitted
 * through `PATCH /api/settings` (admin-gated route) — these tests verify that
 * the Zod schema rejects malicious / malformed input BEFORE the route writes
 * to the database. The route's auth + audit machinery is exercised by the
 * existing settings route test suite.
 */
describe('brandingFieldsSchema — platform URL allowlist', () => {
  it('accepts valid platform URLs', () => {
    const result = brandingFieldsSchema.safeParse({
      community_handle: '@org',
      tagline: 'We ship.',
      logo_url: '/logo.png',
      banner_url: null,
      favicon_url: null,
      og_image_url: null,
      brand_color_primary: '28 100% 50%',
      brand_color_secondary: null,
      footer_note: null,
      social_x: 'https://x.com/organic',
      social_telegram: 'https://t.me/organic',
      social_discord: 'https://discord.gg/abcdef',
      social_youtube: 'https://youtube.com/@organic',
      social_tiktok: 'https://tiktok.com/@organic',
      social_website: 'https://organic.example',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an X URL pointing at a non-X host', () => {
    const result = brandingFieldsSchema.safeParse({
      community_handle: null,
      tagline: null,
      logo_url: null,
      banner_url: null,
      favicon_url: null,
      og_image_url: null,
      brand_color_primary: null,
      brand_color_secondary: null,
      footer_note: null,
      social_x: 'https://evil.example/fake-x',
      social_telegram: null,
      social_discord: null,
      social_youtube: null,
      social_tiktok: null,
      social_website: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects javascript: and data: URLs in any social field', () => {
    const dangerous = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
    ];
    for (const url of dangerous) {
      const result = brandingPatchSchema.safeParse({ social_x: url });
      expect(result.success, `should reject ${url}`).toBe(false);
    }
  });

  it('rejects javascript: URLs in social_website (general http(s) field)', () => {
    const result = brandingPatchSchema.safeParse({ social_website: 'javascript:void(0)' });
    expect(result.success).toBe(false);
  });

  it('coerces empty string to null on every URL field', () => {
    const result = brandingPatchSchema.safeParse({
      social_x: '',
      social_telegram: '',
      social_discord: '',
      social_youtube: '',
      social_tiktok: '',
      social_website: '',
      logo_url: '',
      banner_url: '',
      favicon_url: '',
      og_image_url: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.social_x).toBeNull();
      expect(result.data.social_telegram).toBeNull();
      expect(result.data.social_discord).toBeNull();
      expect(result.data.social_youtube).toBeNull();
      expect(result.data.social_tiktok).toBeNull();
      expect(result.data.social_website).toBeNull();
      expect(result.data.logo_url).toBeNull();
    }
  });

  it('accepts subdomain hosts (e.g. www.x.com, m.youtube.com, vm.tiktok.com)', () => {
    const result = brandingPatchSchema.safeParse({
      social_x: 'https://www.x.com/organic',
      social_youtube: 'https://m.youtube.com/@organic',
      social_tiktok: 'https://vm.tiktok.com/abc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects host-equality bypass (twitter.com.evil.example)', () => {
    const result = brandingPatchSchema.safeParse({
      social_x: 'https://twitter.com.evil.example/path',
    });
    expect(result.success).toBe(false);
  });
});

describe('brandingFieldsSchema — image URL', () => {
  it('accepts root-relative paths', () => {
    const result = brandingPatchSchema.safeParse({ logo_url: '/logo.png' });
    expect(result.success).toBe(true);
  });

  it('rejects protocol-relative URLs (//evil.example/x.png)', () => {
    const result = brandingPatchSchema.safeParse({ logo_url: '//evil.example/x.png' });
    expect(result.success).toBe(false);
  });

  it('rejects javascript: image URLs', () => {
    const result = brandingPatchSchema.safeParse({ logo_url: 'javascript:alert(1)' });
    expect(result.success).toBe(false);
  });

  it('accepts https absolute URLs', () => {
    const result = brandingPatchSchema.safeParse({
      logo_url: 'https://cdn.example.com/logo.png',
    });
    expect(result.success).toBe(true);
  });
});

describe('brandingFieldsSchema — brand color', () => {
  it('accepts a valid HSL string', () => {
    const result = brandingPatchSchema.safeParse({ brand_color_primary: '28 100% 50%' });
    expect(result.success).toBe(true);
  });

  it('rejects hex colors', () => {
    const result = brandingPatchSchema.safeParse({ brand_color_primary: '#ff8800' });
    expect(result.success).toBe(false);
  });

  it('rejects CSS expressions / comma-separated HSL', () => {
    const result = brandingPatchSchema.safeParse({
      brand_color_primary: 'hsl(28, 100%, 50%)',
    });
    expect(result.success).toBe(false);
  });

  it('rejects style-injection attempts via the color field', () => {
    const result = brandingPatchSchema.safeParse({
      brand_color_primary: '0 0% 0%); background: url(javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });
});

describe('brandingFieldsSchema — text fields', () => {
  it('rejects taglines over 160 chars', () => {
    const result = brandingPatchSchema.safeParse({ tagline: 'x'.repeat(161) });
    expect(result.success).toBe(false);
  });

  it('rejects footer_note over 280 chars', () => {
    const result = brandingPatchSchema.safeParse({ footer_note: 'x'.repeat(281) });
    expect(result.success).toBe(false);
  });

  it('trims and accepts handle within length', () => {
    const result = brandingPatchSchema.safeParse({ community_handle: '  @org  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.community_handle).toBe('@org');
    }
  });
});
