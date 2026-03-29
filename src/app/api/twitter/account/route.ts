import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const ACCOUNT_SELECT_COLUMNS =
  'id, user_id, twitter_user_id, twitter_username, display_name, profile_image_url, scope, verified_at, created_at, updated_at, is_active';

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

    const [{ data: account, error: accountError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabase
          .from('twitter_accounts')
          .select(ACCOUNT_SELECT_COLUMNS)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select('twitter, twitter_verified')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

    if (accountError) {
      return NextResponse.json({ error: 'Failed to fetch Twitter account' }, { status: 500 });
    }

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
    }

    return NextResponse.json({
      account,
      profile: {
        twitter: profile?.twitter ?? null,
        twitter_verified: profile?.twitter_verified ?? false,
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching Twitter account:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const username = typeof body?.username === 'string' ? body.username.replace(/^@/, '').trim() : '';

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const [{ error: accountError }, { error: profileError }] = await Promise.all([
      serviceClient
        .from('twitter_accounts')
        .update({ twitter_username: username, display_name: username })
        .eq('user_id', user.id)
        .eq('is_active', true),
      serviceClient
        .from('user_profiles')
        .update({ twitter: `@${username}` })
        .eq('id', user.id),
    ]);

    if (accountError || profileError) {
      return NextResponse.json({ error: 'Failed to update Twitter handle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error updating Twitter handle:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [{ error: accountError }, { error: profileError }] = await Promise.all([
      serviceClient
        .from('twitter_accounts')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true),
      serviceClient
        .from('user_profiles')
        .update({ twitter_verified: false, twitter: null })
        .eq('id', user.id),
    ]);

    if (accountError || profileError) {
      return NextResponse.json({ error: 'Failed to unlink Twitter account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error unlinking Twitter account:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
