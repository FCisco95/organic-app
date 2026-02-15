import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const locales = ['en', 'pt-PT', 'zh-CN'] as const;
type Locale = (typeof locales)[number];

const defaultLocale: Locale = 'en';

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
    // Skip APIs, Next internals, and static asset files.
    '/((?!api|_next|favicon.ico|.*\\..*).*)',
  ],
};
