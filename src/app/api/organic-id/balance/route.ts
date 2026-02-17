import { NextResponse } from 'next/server';
import { getTokenBalance } from '@/lib/solana';
import { parseJsonBody } from '@/lib/parse-json-body';
import { logger } from '@/lib/logger';

// In-memory cache for token balances
// Key: wallet address, Value: { balance, timestamp }
const balanceCache = new Map<string, { balance: number; ts: number }>();

// Cache TTL: 30 seconds
const CACHE_TTL_MS = 30 * 1000;

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody<{ walletAddress?: string }>(request);
    if (parsedBody.error !== null) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const { walletAddress } = parsedBody.data;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Normalize wallet address for consistent caching
    const cacheKey = walletAddress.trim();
    const now = Date.now();

    // Check cache first
    const cached = balanceCache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ balance: cached.balance, cached: true });
    }

    // Cache miss or expired - fetch from Solana RPC
    const balance = await getTokenBalance(walletAddress);

    // Store in cache
    balanceCache.set(cacheKey, { balance, ts: now });

    // Cleanup old entries periodically (keep cache size bounded)
    if (balanceCache.size > 1000) {
      const cutoff = now - CACHE_TTL_MS;
      for (const [key, value] of balanceCache.entries()) {
        if (value.ts < cutoff) {
          balanceCache.delete(key);
        }
      }
    }

    return NextResponse.json({ balance, cached: false });
  } catch (error) {
    logger.error('Balance check error:', error);
    return NextResponse.json({ error: 'Failed to check balance' }, { status: 500 });
  }
}
