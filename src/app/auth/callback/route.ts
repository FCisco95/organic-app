import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[Auth Callback] Error exchanging code for session:', error);
        return NextResponse.redirect(new URL('/auth/error', requestUrl.origin));
      }

      console.log('[Auth Callback] Session exchanged successfully:', {
        hasUser: !!data.user,
        userId: data.user?.id,
        hasSession: !!data.session
      });
    } catch (error) {
      console.error('[Auth Callback] Exception during session exchange:', error);
      return NextResponse.redirect(new URL('/auth/error', requestUrl.origin));
    }
  }

  // Redirect to profile page after email confirmation
  return NextResponse.redirect(new URL('/profile', requestUrl.origin));
}
