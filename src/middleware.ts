import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  applyRateLimit,
  getClientIp,
  RATE_LIMITS,
  shouldBypassIpRateLimit,
  type RateLimitConfig,
} from '@/lib/rate-limit';

const locales = ['en', 'pt-PT', 'zh-CN'] as const;
type Locale = (typeof locales)[number];

const defaultLocale: Locale = 'en';

/**
 * Routes that require authentication. Unauthenticated users are redirected
 * to /login with a returnTo param so they land back after signing in.
 */
const PROTECTED_ROUTE_PREFIXES = [
  '/profile',
  '/notifications',
  '/earn',
  '/rewards',
  '/quests',
  '/disputes',
  '/sprints',
  '/admin',
];

type ApiRateLimitPolicy = {
  bucket: string;
  config: RateLimitConfig;
  scope: 'ip' | 'user';
};

const AUTH_RATE_LIMIT_PATHS = new Set(['/api/auth/nonce', '/api/auth/link-wallet']);
const DASHBOARD_READ_RATE_LIMIT_PATHS = new Set([
  '/api/stats',
  '/api/analytics',
  '/api/leaderboard',
  '/api/treasury',
  '/api/organic-id/balance',
]);
const INTERNAL_BYPASS_PATHS = new Set(['/api/internal/market-cache/refresh']);
const SENSITIVE_RATE_LIMIT_PREFIXES = [
  '/api/settings',
  '/api/rewards/claims',
  '/api/rewards/distributions/manual',
  '/api/organic-id/assign',
];

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isInternalSystemRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') ?? '';

  return (
    userAgent.includes('Next.js') ||
    request.headers.has('x-middleware-subrequest')
  );
}

function getApiRateLimitPolicy(pathname: string, method: string): ApiRateLimitPolicy | null {
  if (method === 'OPTIONS') {
    return null;
  }

  if (INTERNAL_BYPASS_PATHS.has(pathname)) {
    return null;
  }

  if (AUTH_RATE_LIMIT_PATHS.has(pathname)) {
    return { bucket: 'auth', config: RATE_LIMITS.auth, scope: 'ip' };
  }

  if (SENSITIVE_RATE_LIMIT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return { bucket: 'sensitive', config: RATE_LIMITS.sensitive, scope: 'user' };
  }

  if (method === 'GET' || method === 'HEAD') {
    if (DASHBOARD_READ_RATE_LIMIT_PATHS.has(pathname)) {
      return { bucket: 'dashboard-read', config: RATE_LIMITS.dashboardRead, scope: 'ip' };
    }

    return { bucket: 'read', config: RATE_LIMITS.read, scope: 'ip' };
  }

  return { bucket: 'write', config: RATE_LIMITS.write, scope: 'user' };
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

async function applyApiRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const policy = getApiRateLimitPolicy(request.nextUrl.pathname, request.method);
  if (!policy) {
    return null;
  }

  if (policy.scope === 'user') {
    const userId = await getAuthenticatedUserId(request);
    if (userId) {
      const userLimited = await applyRateLimit(
        `api:${policy.bucket}:user:${userId}`,
        policy.config,
        {
          bucket: policy.bucket,
          scope: 'user',
          path: request.nextUrl.pathname,
          identifier: userId,
        }
      );
      if (userLimited) {
        return userLimited;
      }
      return null;
    }
  }

  const ip = getClientIp(request);
  if (shouldBypassIpRateLimit(ip)) {
    return null;
  }
  return applyRateLimit(`api:${policy.bucket}:ip:${ip}`, policy.config, {
    bucket: policy.bucket,
    scope: 'ip',
    path: request.nextUrl.pathname,
    identifier: ip,
  });
}

function getLocale(request: NextRequest): Locale {
  // Check if user has explicitly chosen a locale (cookie set by language switcher)
  const preferredLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (preferredLocale && (locales as readonly string[]).includes(preferredLocale)) {
    return preferredLocale as Locale;
  }

  // Default to English for all visitors — they can switch manually
  return defaultLocale;
}

/**
 * Build a Content-Security-Policy header value with the given nonce.
 * Directives mirror what was previously in next.config.js, but script-src
 * now uses a per-request nonce instead of 'unsafe-inline'.
 */
function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://raw.githubusercontent.com https://pbs.twimg.com https://abs.twimg.com https://opengraph.githubassets.com https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mainnet-beta.solana.com https://*.helius.dev https://*.quiknode.pro https://api.jup.ag https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
    "frame-src https://dexscreener.com https://www.geckoterminal.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

// Detect Next.js App Router RSC prefetch / data-only requests.
//
// Next.js Edge Runtime strips the obvious signals (the `RSC` and
// `Next-Router-Prefetch` headers, the `_rsc` query param) before middleware
// runs, so none of those are observable here. The reliable signal that
// still reaches us is the Accept header: full page navigations request
// `text/html,...`, while Next's router fetches RSC payloads with `* / *`
// (without spaces).
function isRscPrefetch(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  return accept.length > 0 && !accept.includes('text/html');
}

export async function middleware(request: NextRequest) {
  // CVE-2025-29927: Strip internal header to prevent middleware bypass
  request.headers.delete('x-middleware-subrequest');

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (process.env.NODE_ENV === 'development' && isLocalHost(request.nextUrl.hostname)) {
      return NextResponse.next();
    }

    if (isInternalSystemRequest(request)) {
      return NextResponse.next();
    }

    const rateLimited = await applyApiRateLimit(request);
    if (rateLimited) {
      return rateLimited;
    }

    return NextResponse.next();
  }

  const rscPrefetch = isRscPrefetch(request);

  // Skip if URL already has a locale prefix
  const pathnameHasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // RSC prefetches don't contain inline scripts, so they don't need a CSP
  // nonce. Skipping nonce generation here avoids unnecessary per-request work
  // and prevents the router from seeing a fresh Content-Security-Policy
  // header on every prefetch response (which was churning Next's internal
  // cache behavior).
  const requestHeaders = new Headers(request.headers);
  let response: NextResponse;

  if (rscPrefetch) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    // Generate a per-request nonce for CSP (Edge-compatible crypto)
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    requestHeaders.set('x-nonce', nonce);

    response = NextResponse.next({ request: { headers: requestHeaders } });

    // Set CSP with per-request nonce on all real page responses
    response.headers.set('Content-Security-Policy', buildCspHeader(nonce));
    response.headers.set('x-nonce', nonce);
  }

  // Strip locale prefix to get the bare route for protection checks
  const localeMatch = pathname.match(/^\/[a-z]{2}(-[a-zA-Z]{2,})?(\/.*)?$/);
  const barePathname = localeMatch?.[2] || '/';

  const isProtected = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => barePathname === prefix || barePathname.startsWith(`${prefix}/`)
  );

  // Skip the Supabase auth roundtrip entirely for public routes — most page
  // navigations don't need an auth check, and getUser() does a network call.
  if (!isProtected) {
    return response;
  }

  // On an RSC prefetch of a protected route, responding with a 302 to /login
  // breaks Next's router: it can't follow a redirect on a prefetch response
  // and the fetch() rejects with "TypeError: Failed to fetch", after which
  // every subsequent click to that link does a full browser navigation
  // instead of a soft client transition. Returning 204 tells the router
  // "prefetch unavailable, fall back to normal navigation on click", which
  // then hits the middleware as a real request and redirects to login
  // properly.
  if (rscPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = pathname.match(/^\/([a-z]{2}(-[a-zA-Z]{2,})?)/)?.[1] || defaultLocale;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set('returnTo', barePathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and static asset files.
    '/((?!_next|favicon.ico|.*\\..*).*)',
  ],
};
