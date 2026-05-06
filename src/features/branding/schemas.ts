import { z } from 'zod';

/**
 * Per-platform URL validators. Each accepts:
 *   - empty string  → coerced to null (admin clearing the field)
 *   - null          → kept as null
 *   - http(s) URL whose hostname matches the platform's allowlist
 *
 * Accepting the empty string is necessary because `<input>` elements emit ''
 * when cleared, and we want the form to round-trip cleanly with the DB which
 * stores NULL.
 */

const allowedHosts = {
  x: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
  telegram: ['t.me', 'telegram.me', 'telegram.org', 'www.telegram.org'],
  discord: ['discord.gg', 'discord.com', 'www.discord.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
} as const;

function platformUrl(hosts: readonly string[]) {
  return z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .refine(
      (value) => {
        if (value === null) return true;
        try {
          const url = new URL(value);
          if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
          return hosts.some(
            (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
          );
        } catch {
          return false;
        }
      },
      { message: `URL must be on one of: ${hosts.join(', ')}` },
    );
}

const websiteUrl = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((value) => (value === '' ? null : value))
  .refine(
    (value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Website must be a valid http(s) URL' },
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value));

/** HSL string like `"28 100% 50%"` — three space-separated values, no commas. */
const hslColor = z
  .string()
  .trim()
  .regex(
    /^\d{1,3}\s+\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%$/,
    'Brand color must be HSL like "28 100% 50%"',
  )
  .nullable()
  .transform((value) => (value === '' ? null : value));

const optionalImageUrl = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .transform((value) => (value === '' ? null : value))
  .refine(
    (value) => {
      if (value === null) return true;
      // Accept absolute https/http URLs OR root-relative paths starting with `/`.
      if (value.startsWith('/')) return !value.startsWith('//');
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Image must be a root-relative path (/foo.png) or http(s) URL' },
  );

export const brandingFieldsSchema = z.object({
  community_handle: optionalText(64),
  tagline: optionalText(160),
  logo_url: optionalImageUrl,
  banner_url: optionalImageUrl,
  favicon_url: optionalImageUrl,
  og_image_url: optionalImageUrl,
  brand_color_primary: hslColor,
  brand_color_secondary: hslColor,
  footer_note: optionalText(280),
  social_x: platformUrl(allowedHosts.x),
  social_telegram: platformUrl(allowedHosts.telegram),
  social_discord: platformUrl(allowedHosts.discord),
  social_youtube: platformUrl(allowedHosts.youtube),
  social_tiktok: platformUrl(allowedHosts.tiktok),
  social_website: websiteUrl,
});

export type BrandingFieldsInput = z.infer<typeof brandingFieldsSchema>;

/**
 * Client-side patch schema: every field optional. The PATCH payload only
 * includes fields the admin actually changed.
 */
export const brandingPatchSchema = brandingFieldsSchema.partial();
export type BrandingPatchInput = z.infer<typeof brandingPatchSchema>;
