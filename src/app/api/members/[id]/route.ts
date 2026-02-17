import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'id, name, email, avatar_url, organic_id, role, total_points, tasks_completed, profile_visible, bio, location, website, twitter, discord, wallet_pubkey, created_at'
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // If profile is not visible, return limited info
    if (!data.profile_visible) {
      return NextResponse.json({
        data: {
          id: data.id,
          name: null,
          email: '',
          avatar_url: null,
          organic_id: data.organic_id,
          role: data.role,
          total_points: data.total_points,
          tasks_completed: data.tasks_completed,
          profile_visible: false,
          bio: null,
          location: null,
          website: null,
          twitter: null,
          discord: null,
          wallet_pubkey: null,
          created_at: data.created_at,
        },
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    logger.error('Member detail API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
