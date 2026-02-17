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
  const acceptLanguage = request.headers.get('accept-language') || '';
  const browserLocales = acceptLanguage.split(',').map((l) => l.split(';')[0].trim());

  // Check for exact match
  for (const browserLocale of browserLocales) {
    if ((locales as readonly string[]).includes(browserLocale)) {
      return browserLocale as Locale;
    }
  }

  // Check for language match
  for (const browserLocale of browserLocales) {
    const baseLocale = browserLocale.split('-')[0];
    const matchingLocale = (locales as readonly string[]).find((l) => l.startsWith(baseLocale));
    if (matchingLocale) {
      return matchingLocale as Locale;
    }
  }

  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (isLocalHost(request.nextUrl.hostname)) {
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

  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

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

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and static asset files.
    '/((?!_next|favicon.ico|.*\\..*).*)',
  ],
};
