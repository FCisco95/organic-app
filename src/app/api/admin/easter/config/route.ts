import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { updateEggHuntConfigSchema } from '@/features/easter/schemas';

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
      .from('egg_hunt_config' as any)
      .select('*')
      .limit(1)
      .single();

    if (error) {
      logger.error('Admin egg hunt config GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Admin egg hunt config GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authErr, user } = await requireAdmin(supabase);
    if (authErr) return authErr;

    const body = await request.json();
    const parsed = updateEggHuntConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    // Get current config id
    const { data: currentRaw } = await supabase
      .from('egg_hunt_config' as any)
      .select('id')
      .limit(1)
      .single();
    const current = currentRaw as any;

    if (!current) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('egg_hunt_config' as any)
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
        updated_by: user!.id,
      })
      .eq('id', current.id)
      .select()
      .single();

    if (error) {
      logger.error('Admin egg hunt config PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Admin egg hunt config PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
