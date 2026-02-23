import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { createQuestSchema } from '@/features/gamification/schemas';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'council'].includes(profile.role ?? '')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user, profile: null };
  }

  return { error: null, user, profile };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authErr } = await requireAdmin(supabase);
    if (authErr) return authErr;

    const { data, error } = await supabase
      .from('quests' as any)
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Admin quests GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authErr, profile } = await requireAdmin(supabase);
    if (authErr) return authErr;

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create quests' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createQuestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('quests' as any)
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    logger.error('Admin quests POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
