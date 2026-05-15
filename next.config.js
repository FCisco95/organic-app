const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');
let withBundleAnalyzer = (config) => config;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
} catch {
  // @next/bundle-analyzer is optional — only needed for ANALYZE=true builds
}

// isProductionBuild: true only during `next build` (NEXT_PHASE = 'phase-production-build').
// During `next dev` NEXT_PHASE = 'phase-development-server' (or may be unset on first eval).
// We never want Sentry's instrumentationHook or edge bundle in dev — it uses eval() which
// is blocked by the edge runtime. Only enable for actual production builds.
const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Only load Sentry in production — importing it in dev triggers webpack issues
const { withSentryConfig } = isProductionBuild
  ? require('@sentry/nextjs')
  : { withSentryConfig: (c) => c };

// CSP is now set dynamically in middleware with per-request nonces.
// See src/middleware.ts for the full Content-Security-Policy configuration.

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
          },
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
    // Only enable in production builds — avoids Sentry edge-instrumentation EvalError in dev
    instrumentationHook: isProductionBuild,
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
      !process.env.SENTRY_AUTH_TOKEN || !process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT,
  },
};

const finalConfig = withBundleAnalyzer(withNextIntl(nextConfig));
module.exports = isProductionBuild
  ? withSentryConfig(finalConfig, sentryBuildOptions)
  : finalConfig;
