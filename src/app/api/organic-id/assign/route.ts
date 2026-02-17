import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isOrgHolder } from '@/lib/solana';
import { logger } from '@/lib/logger';

const ASSIGN_PROFILE_COLUMNS = 'id, organic_id, wallet_pubkey';

type UserProfile = {
  id: string;
  organic_id: number | null;
  wallet_pubkey: string | null;
};

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.organic_id === null || typeof candidate.organic_id === 'number') &&
    (candidate.wallet_pubkey === null || typeof candidate.wallet_pubkey === 'string')
  );
}

export async function POST(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token and get user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please sign in again.' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select(ASSIGN_PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !isUserProfile(profileData)) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileData;

    // Check if user already has an Organic ID
    if (profile.organic_id) {
      return NextResponse.json(
        { error: 'You already have an Organic ID', organicId: profile.organic_id },
        { status: 400 }
      );
    }

    // Check if wallet is linked
    if (!profile.wallet_pubkey) {
      return NextResponse.json({ error: 'Please link your wallet first' }, { status: 400 });
    }

    // Check if user holds ORG tokens
    const isHolder = await isOrgHolder(profile.wallet_pubkey);

    if (!isHolder) {
      return NextResponse.json(
        { error: 'You must hold $ORG tokens to get an Organic ID' },
        { status: 400 }
      );
    }

    // Use service client to get next Organic ID and update profile
    const serviceSupabase = createServiceClient();

    // Get next organic_id using the database function
    const { data: nextIdData, error: nextIdError } =
      await serviceSupabase.rpc('get_next_organic_id');

    if (nextIdError || typeof nextIdData !== 'number') {
      return NextResponse.json({ error: 'Failed to generate Organic ID' }, { status: 500 });
    }

    const organicId = nextIdData;

    // Update user profile with Organic ID and upgrade role to member
    const { error: updateError } = await serviceSupabase
      .from('user_profiles')
      .update({
        organic_id: organicId,
        role: 'member',
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to assign Organic ID' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organicId,
      message: `Organic ID #${organicId} assigned successfully!`,
    });
  } catch (error) {
    logger.error('Organic ID assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
