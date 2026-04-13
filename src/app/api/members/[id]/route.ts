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
      .maybeSingle();

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

    // Check if the requester is viewing their own profile
    const { data: { user } } = await supabase.auth.getUser();
    const isSelf = user?.id === data.id;

    // Redact sensitive PII for non-self views
    const sanitized = {
      ...data,
      email: isSelf ? data.email : (data.email ?? '').split('@')[0] + '@***',
      wallet_pubkey: isSelf ? data.wallet_pubkey : null,
    };

    return NextResponse.json({ data: sanitized });
  } catch (err) {
    logger.error('Member detail API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
