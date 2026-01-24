import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

// Extract nonce from the signed message
function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce:\s*(.+)$/);
  return match ? match[1].trim() : null;
}

export async function POST(request: Request) {
  try {
    const { walletAddress, signature, message } = await request.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract and validate nonce from message
    const nonce = extractNonceFromMessage(message);
    if (!nonce) {
      return NextResponse.json({ error: 'Invalid message format: missing nonce' }, { status: 400 });
    }

    // Validate nonce against database (using service client to bypass RLS)
    const serviceClient = createServiceClient();
    const { data: nonceRecord, error: nonceError } = await serviceClient
      .from('wallet_nonces')
      .select('id, expires_at, used_at')
      .eq('nonce', nonce)
      .maybeSingle();

    if (nonceError) {
      return NextResponse.json({ error: 'Failed to validate nonce' }, { status: 500 });
    }

    if (!nonceRecord) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
    }

    if (nonceRecord.used_at) {
      return NextResponse.json({ error: 'Nonce already used' }, { status: 401 });
    }

    if (new Date(nonceRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Nonce expired' }, { status: 401 });
    }

    // Verify the signature
    const publicKey = new PublicKey(walletAddress);
    const signatureBuffer = bs58.decode(signature);
    const messageBuffer = new TextEncoder().encode(message);

    const isValid = nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKey.toBytes());

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Mark nonce as used immediately after signature verification
    const { error: updateNonceError } = await serviceClient
      .from('wallet_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('id', nonceRecord.id);

    // Continue even if marking nonce fails - validation was successful

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

    // Check if wallet is already linked to another account
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_pubkey', walletAddress)
      .neq('id', user.id)
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
      .update({ wallet_pubkey: walletAddress })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to link wallet' }, { status: 500 });
    }

    return NextResponse.json({ success: true, walletAddress });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
