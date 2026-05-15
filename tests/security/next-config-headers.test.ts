import { describe, expect, it } from 'vitest';

// next.config.js wraps the config through withNextIntl + withBundleAnalyzer +
// withSentryConfig. In test (NODE_ENV !== 'production'), Sentry is bypassed
// and the wrapped object still exposes productionBrowserSourceMaps + headers().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextConfig = require('../../next.config.js');

describe('next.config.js: hardening', () => {
  it('disables productionBrowserSourceMaps explicitly', () => {
    // Defaulting works today, but an env-driven flip would silently ship
    // sourcemaps to browsers. Lock the value.
    expect(nextConfig.productionBrowserSourceMaps).toBe(false);
  });

  it('Permissions-Policy disables risky and legacy browser features', async () => {
    const headerSets = await nextConfig.headers();
    const fallback = headerSets.find(
      (group: { source: string }) => group.source === '/(.*)'
    );
    expect(fallback).toBeDefined();

    const permissions = fallback.headers.find(
      (h: { key: string }) => h.key === 'Permissions-Policy'
    );
    expect(permissions, 'Permissions-Policy header missing').toBeDefined();

    const value: string = permissions.value;
    for (const feature of [
      'camera',
      'microphone',
      'geolocation',
      'payment',
      'usb',
      'interest-cohort',
      'browsing-topics',
    ]) {
      expect(value, `${feature} not disabled in Permissions-Policy`).toContain(
        `${feature}=()`
      );
    }
  });

  it('preserves the existing baseline security headers', async () => {
    const headerSets = await nextConfig.headers();
    const fallback = headerSets.find(
      (group: { source: string }) => group.source === '/(.*)'
    );
    const headers = Object.fromEntries(
      fallback.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    );

    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    expect(headers['Strict-Transport-Security']).toContain('preload');
  });
});
