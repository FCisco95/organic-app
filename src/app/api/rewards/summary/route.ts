import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin/council only
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';
    if (!isAdminOrCouncil) {
      return NextResponse.json({ error: 'Admin or council access required' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('get_rewards_summary');

    if (error) {
      logger.error('Rewards summary RPC error:', error);
      return NextResponse.json({ error: 'Failed to fetch rewards summary' }, { status: 500 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    logger.error('Rewards summary error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
