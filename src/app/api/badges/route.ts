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

    const { data, error } = await supabase
      .from('user_badges' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (error) {
      logger.error('Badges GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as any[] });
  } catch (error) {
    logger.error('Badges GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
