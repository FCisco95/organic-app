import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user };
  }

  return { error: null, user };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authErr } = await requireAdmin(supabase);
    if (authErr) return authErr;

    const { data, error } = await supabase
      .from('user_badges' as any)
      .select('*, user_profiles(display_name, avatar_url)')
      .order('earned_at', { ascending: false });

    if (error) {
      logger.error('Admin badges GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as any[] });
  } catch (error) {
    logger.error('Admin badges GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
