import { NextResponse } from 'next/server';

/**
 * Simple in-memory sliding window rate limiter.
 * Suitable for single-instance deployments (Vercel serverless).
 * For distributed rate limiting, replace with @upstash/ratelimit + Redis.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
};

/**
 * Check rate limit for a given key (e.g., user ID or IP).
 * Returns { success, limit, remaining, resetMs }.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  cleanup(config.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.limit) {
    const oldestInWindow = entry.timestamps[0];
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetMs: oldestInWindow + config.windowMs - now,
    };
  }

  entry.timestamps.push(now);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
    resetMs: config.windowMs,
  };
}

/**
 * Apply rate limiting to an API route. Returns a 429 response if limit exceeded, or null if allowed.
 *
 * Usage:
 * ```ts
 * const rateLimited = applyRateLimit(userId, { limit: 5, windowMs: 60_000 });
 * if (rateLimited) return rateLimited;
 * ```
 */
export function applyRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(key, config);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}

// Pre-configured rate limit presets
export const RATE_LIMITS = {
  /** Auth endpoints: 10 req/min per IP */
  auth: { limit: 10, windowMs: 60_000 },
  /** Proposal creation: 5 req/min per user */
  proposalCreate: { limit: 5, windowMs: 60_000 },
  /** Dispute creation: 3 req/min per user */
  disputeCreate: { limit: 3, windowMs: 60_000 },
  /** Reward claims: 5 req/min per user */
  rewardClaim: { limit: 5, windowMs: 60_000 },
  /** Task submissions: 10 req/min per user */
  taskSubmission: { limit: 10, windowMs: 60_000 },
} as const;
