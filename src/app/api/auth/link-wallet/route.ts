import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { parseJsonBody } from '@/lib/parse-json-body';
import { linkWalletSchema } from '@/features/auth/schemas';
import { consumeWalletNonce } from '@/features/auth/nonce';
import { applyIpRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// Extract nonce from the signed message
function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce:\s*(.+)$/);
  return match ? match[1].trim() : null;
}

// Validate that the signed message contains the expected app domain
// to prevent cross-app signature replay attacks
function validateMessageDomain(message: string): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://organic-app-rust.vercel.app';
  const appDomain = new URL(appUrl).host;
  return message.includes(appDomain);
}

export async function POST(request: Request) {
  try {
    const rateLimited = await applyIpRateLimit(request, 'auth:link-wallet', RATE_LIMITS.auth);
    if (rateLimited) {
      return rateLimited;
    }

    const { data: body, error: jsonError } = await parseJsonBody(request);
    if (jsonError) {
      return NextResponse.json({ error: jsonError }, { status: 400 });
    }

    const validationResult = linkWalletSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid wallet link data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, signature, message } = validationResult.data;

    // Validate message domain binding (prevent cross-app signature replay)
    if (!validateMessageDomain(message)) {
      return NextResponse.json({ error: 'Invalid message domain' }, { status: 400 });
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

    // Atomic nonce consume: a single conditional UPDATE with .is('used_at',
    // null) is the only way to guarantee single-use under concurrent calls.
    // If zero rows come back, another request consumed it first — replay.
    // Cast to a structural type so the helper doesn't try to deep-instantiate
    // the full Database generic — the runtime contract is what matters.
    const consumeResult = await consumeWalletNonce(
      serviceClient as unknown as Parameters<typeof consumeWalletNonce>[0],
      nonceRecord.id,
    );
    if (!consumeResult.ok) {
      if (consumeResult.reason === 'already-used') {
        return NextResponse.json(
          { error: 'Nonce already used or expired' },
          { status: 409 },
        );
      }
      logger.error('Failed to consume wallet nonce', {
        nonceId: nonceRecord.id,
        message: consumeResult.message,
      });
      return NextResponse.json({ error: 'Failed to validate nonce' }, { status: 500 });
    }

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

    // Log wallet link activity (non-blocking — logging must never break the main flow)
    serviceClient
      .from('activity_log')
      .insert({
        actor_id: user.id,
        event_type: 'wallet_linked' as any,
        subject_type: 'user',
        subject_id: user.id,
        metadata: { wallet_pubkey: walletAddress },
      })
      .then(({ error: logError }) => {
        if (logError) {
          logger.error('Failed to log wallet_linked activity:', logError);
        }
      });

    return NextResponse.json({ success: true, walletAddress });
  } catch (error) {
    logger.error('Link wallet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
