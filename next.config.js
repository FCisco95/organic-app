const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');
let withBundleAnalyzer = (config) => config;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
} catch {
  // @next/bundle-analyzer is optional — only needed for ANALYZE=true builds
}
// Only load Sentry in production — importing it in dev triggers edge runtime EvalError
const { withSentryConfig } =
  process.env.NODE_ENV === 'production'
    ? require('@sentry/nextjs')
    : { withSentryConfig: (c) => c };

// CSP is now set dynamically in middleware with per-request nonces.
// See src/middleware.ts for the full Content-Security-Policy configuration.

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // CSP is set dynamically in middleware (nonce-based) — do not duplicate here
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    instrumentationHook: process.env.NODE_ENV !== 'development',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
    ],
  },
};

const sentryBuildOptions = {
  org: process.env.SENTRY_ORG || 'organic-xk',
  project: process.env.SENTRY_PROJECT || 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  sourcemaps: {
    disable:
      !process.env.SENTRY_AUTH_TOKEN ||
      !process.env.SENTRY_ORG ||
      !process.env.SENTRY_PROJECT,
  },
};

const finalConfig = withBundleAnalyzer(withNextIntl(nextConfig));
// Skip Sentry webpack wrapping in dev — edge runtime EvalError blocks all requests
module.exports =
  process.env.NODE_ENV === 'development'
    ? finalConfig
    : withSentryConfig(finalConfig, sentryBuildOptions);
