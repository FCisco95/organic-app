import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

export async function POST(request: Request) {
  try {
    const { walletAddress, signature, message } = await request.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the signature
    const publicKey = new PublicKey(walletAddress);
    const signatureBuffer = bs58.decode(signature);
    const messageBuffer = new TextEncoder().encode(message);

    const isValid = nacl.sign.detached.verify(
      messageBuffer,
      signatureBuffer,
      publicKey.toBytes()
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

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

    // Check if wallet is already linked to another account
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_pubkey', walletAddress)
      .neq('id', user.id as any)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'This wallet is already linked to another account' },
        { status: 400 }
      );
    }

    // Link wallet to user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ wallet_pubkey: walletAddress } as any)
      .eq('id', user.id as any);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to link wallet' }, { status: 500 });
    }

    return NextResponse.json({ success: true, walletAddress });
  } catch (error: any) {
    console.error('Error in link-wallet:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
