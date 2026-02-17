import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { applyIpRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// Nonce expires after 5 minutes
const NONCE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const rateLimited = await applyIpRateLimit(request, 'auth:nonce', RATE_LIMITS.auth);
    if (rateLimited) {
      return rateLimited;
    }

    // Generate a random nonce for SIWS (Sign-In-With-Solana)
    const nonce = randomBytes(32).toString('base64');
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

    // Store nonce in database for later validation
    const supabase = createServiceClient();
    const { error } = await supabase.from('wallet_nonces').insert({
      nonce,
      expires_at: expiresAt,
    });

    if (error) {
      logger.error('Error storing nonce:', error);
      return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 });
    }

    return NextResponse.json({ nonce });
  } catch (error) {
    logger.error('Error in nonce generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
