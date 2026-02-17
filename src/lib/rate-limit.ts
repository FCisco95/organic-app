import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Rate limiter with optional Upstash Redis REST backend.
 * Falls back to in-memory sliding window when Upstash env vars are not configured.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function shouldBypassRateLimiting(): boolean {
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return true;
  }

  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true;
  }

  const isVercelRuntime =
    process.env.VERCEL === '1' && Boolean(process.env.VERCEL_URL);

  // Local/dev environments are bypassed by default.
  if (!isVercelRuntime && process.env.ENABLE_RATE_LIMIT_NON_VERCEL !== 'true') {
    return true;
  }

  return false;
}

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

export type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

export type RateLimitLogContext = {
  bucket?: string;
  scope?: 'ip' | 'user';
  path?: string;
  identifier?: string;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
};

type UpstashPipelineResponseItem = {
  result?: unknown;
  error?: string | null;
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

function getUpstashConfig():
  | { url: string; token: string }
  | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function readPipelineResultNumber(
  payload: unknown,
  index: number,
  fallback: number
): number {
  if (!Array.isArray(payload)) {
    return fallback;
  }

  const item = payload[index] as UpstashPipelineResponseItem | undefined;
  const value = Number(item?.result);
  return Number.isFinite(value) ? value : fallback;
}

async function runUpstashPipeline(
  url: string,
  token: string,
  commands: Array<Array<string>>
): Promise<unknown | null> {
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function checkUpstashRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const upstash = getUpstashConfig();
  if (!upstash) {
    return null;
  }

  const now = Date.now();
  const bucket = Math.floor(now / config.windowMs);
  const redisKey = `rate_limit:${key}:${bucket}`;

  const pipelinePayload = await runUpstashPipeline(upstash.url, upstash.token, [
    ['INCR', redisKey],
    ['PTTL', redisKey],
  ]);

  if (pipelinePayload === null) {
    return null;
  }

  const count = readPipelineResultNumber(pipelinePayload, 0, 0);
  let ttlMs = readPipelineResultNumber(pipelinePayload, 1, -1);

  if (count <= 0) {
    return null;
  }

  if (count === 1 || ttlMs <= 0) {
    await runUpstashPipeline(upstash.url, upstash.token, [
      ['PEXPIRE', redisKey, String(config.windowMs)],
    ]);
    ttlMs = config.windowMs;
  }

  const success = count <= config.limit;
  return {
    success,
    limit: config.limit,
    remaining: success ? Math.max(0, config.limit - count) : 0,
    resetMs: ttlMs > 0 ? ttlMs : config.windowMs,
  };
}

/**
 * Apply rate limiting to an API route. Returns a 429 response if limit exceeded, or null if allowed.
 *
 * Usage:
 * ```ts
 * const rateLimited = await applyRateLimit(userId, { limit: 5, windowMs: 60_000 });
 * if (rateLimited) return rateLimited;
 * ```
 */
export async function applyRateLimit(
  key: string,
  config: RateLimitConfig,
  context?: RateLimitLogContext
): Promise<NextResponse | null> {
  if (shouldBypassRateLimiting()) {
    return null;
  }

  const result =
    (await checkUpstashRateLimit(key, config)) ?? checkRateLimit(key, config);

  if (!result.success) {
    if (process.env.RATE_LIMIT_DEBUG === 'true' || process.env.NODE_ENV === 'production') {
      const identifier = context?.identifier ?? key;
      logger.warn('Rate limit blocked request', {
        key,
        path: context?.path ?? 'unknown',
        bucket: context?.bucket ?? 'unknown',
        scope: context?.scope ?? 'unknown',
        identifier_preview:
          identifier.length > 8
            ? `${identifier.slice(0, 4)}...${identifier.slice(-4)}`
            : identifier,
        retry_after_seconds: Math.ceil(result.resetMs / 1000),
      });
    }

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

/**
 * Resolve best-effort client IP from common proxy/CDN headers.
 * Falls back to "unknown" if nothing is present.
 */
export function getClientIp(request: Request): string {
  const maybeRequestWithIp = request as Request & { ip?: string | null };
  if (typeof maybeRequestWithIp.ip === 'string' && maybeRequestWithIp.ip.length > 0) {
    return maybeRequestWithIp.ip;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(',');
    if (firstIp && firstIp.trim().length > 0) {
      return firstIp.trim();
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  const cloudflareIp = request.headers.get('cf-connecting-ip');
  if (cloudflareIp && cloudflareIp.trim().length > 0) {
    return cloudflareIp.trim();
  }

  return 'unknown';
}

function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalhostRequest(request: Request): boolean {
  try {
    const hostname = new URL(request.url).hostname;
    return isLocalhostHostname(hostname);
  } catch {
    return false;
  }
}

export function shouldBypassIpRateLimit(ip: string): boolean {
  return ip === 'unknown' || isLoopbackIp(ip);
}

/**
 * Apply an IP-based rate limit to a route.
 */
export function applyIpRateLimit(
  request: Request,
  bucket: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  if (isLocalhostRequest(request)) {
    return Promise.resolve(null);
  }

  const ip = getClientIp(request);
  if (shouldBypassIpRateLimit(ip)) {
    return Promise.resolve(null);
  }
  return applyRateLimit(`${bucket}:ip:${ip}`, config, {
    bucket,
    scope: 'ip',
    path: new URL(request.url).pathname,
    identifier: ip,
  });
}

/**
 * Apply a user-based rate limit to a route.
 */
export function applyUserRateLimit(
  userId: string,
  bucket: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  return applyRateLimit(`${bucket}:user:${userId}`, config, {
    bucket,
    scope: 'user',
    identifier: userId,
  });
}

// Pre-configured rate limit presets
export const RATE_LIMITS = {
  /** Auth endpoints: 10 req/min per IP */
  auth: { limit: 10, windowMs: 60_000 },
  /** Read endpoints: 100 req/min per IP */
  read: { limit: 100, windowMs: 60_000 },
  /** Cache-backed dashboard reads: 300 req/min per IP */
  dashboardRead: { limit: 300, windowMs: 60_000 },
  /** Write endpoints: 20 req/min per user/IP */
  write: { limit: 20, windowMs: 60_000 },
  /** Sensitive endpoints: 5 req/min per user/IP */
  sensitive: { limit: 5, windowMs: 60_000 },

  // Legacy aliases kept for compatibility with existing route imports.
  /** Proposal creation: 20 req/min per user */
  proposalCreate: { limit: 20, windowMs: 60_000 },
  /** Dispute creation: 20 req/min per user */
  disputeCreate: { limit: 20, windowMs: 60_000 },
  /** Reward claims: 5 req/min per user */
  rewardClaim: { limit: 5, windowMs: 60_000 },
  /** Task submissions: 20 req/min per user */
  taskSubmission: { limit: 20, windowMs: 60_000 },
} as const;
