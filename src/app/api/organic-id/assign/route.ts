import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isOrgHolder } from '@/lib/solana';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated. Please sign in again.' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id as any)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

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
    const { data: nextIdData, error: nextIdError } = await serviceSupabase.rpc(
      'get_next_organic_id'
    );

    if (nextIdError) {
      console.error('Error getting next Organic ID:', nextIdError);
      return NextResponse.json({ error: 'Failed to generate Organic ID' }, { status: 500 });
    }

    const organicId = nextIdData as number;

    // Update user profile with Organic ID and upgrade role to member
    const { error: updateError } = await serviceSupabase
      .from('user_profiles')
      .update({
        organic_id: organicId,
        role: 'member',
      } as any)
      .eq('id', user.id as any);

    if (updateError) {
      console.error('Error updating profile with Organic ID:', updateError);
      return NextResponse.json({ error: 'Failed to assign Organic ID' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organicId,
      message: `Organic ID #${organicId} assigned successfully!`,
    });
  } catch (error: any) {
    console.error('Error in assign Organic ID:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
