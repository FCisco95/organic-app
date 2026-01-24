import { createClient } from '@/lib/supabase/server';
import { defaultLocale, locales } from '@/i18n/navigation';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const [, localeSegment] = requestUrl.pathname.split('/');
  const locale = locales.includes(localeSegment as (typeof locales)[number])
    ? localeSegment
    : defaultLocale;
  const basePath = `/${locale}`;

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(new URL(`${basePath}/auth/error`, requestUrl.origin));
      }
    } catch {
      return NextResponse.redirect(new URL(`${basePath}/auth/error`, requestUrl.origin));
    }
  }

  // Redirect to profile page after email confirmation
  return NextResponse.redirect(new URL(`${basePath}/profile`, requestUrl.origin));
}
