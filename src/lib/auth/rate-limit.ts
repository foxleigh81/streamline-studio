/**
 * Rate Limiting
 *
 * Implements Redis-based rate limiting for authentication endpoints with
 * in-memory fallback for local development.
 *
 * Production deployments MUST use Redis to ensure rate limiting works
 * correctly across multiple instances and persists across restarts.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { TRPCError } from '@trpc/server';
import Redis from 'ioredis';
import { createLogger } from '@/lib/logger';

const logger = createLogger('rate-limit');

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Rate limit record for tracking requests (in-memory fallback only)
 */
interface RateLimitRecord {
  /** Number of requests in the current window */
  count: number;
  /** Timestamp when the window resets */
  resetAt: number;
}

/**
 * Rate limit configurations for different endpoints
 * @see ADR-007: Rate Limiting Configuration
 */
export const RATE_LIMITS = {
  login: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  registration: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  general: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Redis client (singleton)
 */
let redisClient: Redis | null = null;

/**
 * In-memory fallback store (used only in development without Redis)
 */
const inMemoryStore = new Map<string, RateLimitRecord>();

/**
 * Initialize Redis connection
 */
function getRedisClient(): Redis | null {
  // Return existing client if already initialized
  if (redisClient !== null) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  // No Redis URL configured
  if (!redisUrl) {
    // In production, warn about missing Redis (security risk)
    if (process.env.NODE_ENV === 'production') {
      logger.warn(
        'REDIS_URL not configured in production. ' +
          'Rate limiting will use in-memory fallback which does NOT work ' +
          'correctly with multiple instances or server restarts. ' +
          'Configure Redis for production deployments.'
      );
    } else {
      logger.info('Using in-memory rate limiting in development mode');
    }
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      // Reconnection strategy
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    return redisClient;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis client');
    return null;
  }
}

/**
 * Check rate limit using Redis (production)
 */
async function checkRateLimitRedis(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const windowKey = `rate_limit:${key}`;

  try {
    // Use Redis INCR for atomic increment
    const count = await redis.incr(windowKey);

    // Set expiration on first request
    if (count === 1) {
      await redis.pexpire(windowKey, config.windowMs);
    }

    // Check if limit exceeded
    if (count > config.limit) {
      // Get TTL to calculate retry-after
      const ttl = await redis.pttl(windowKey);
      const retryAfterSeconds = ttl > 0 ? Math.ceil(ttl / 1000) : 60;

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`,
      });
    }
  } catch (error) {
    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Redis error - decide fail-open or fail-closed
    const failClosed = process.env.RATE_LIMIT_FAIL_CLOSED === 'true';

    if (failClosed) {
      // Fail closed: deny request when Redis is unavailable (more secure)
      logger.error({ error }, 'Redis error, failing closed');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Rate limiting service temporarily unavailable',
      });
    } else {
      // Fail open: allow request when Redis is unavailable (default)
      logger.error({ error }, 'Redis error, failing open (allowing request)');
      // Allow the request to proceed
    }
  }
}

/**
 * Check rate limit using in-memory store (development fallback)
 */
function checkRateLimitInMemory(key: string, config: RateLimitConfig): void {
  const now = Date.now();
  const record = inMemoryStore.get(key);

  // No existing record or window expired - create new
  if (!record || now > record.resetAt) {
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return;
  }

  // Check if limit exceeded
  if (record.count >= config.limit) {
    const retryAfterMs = record.resetAt - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`,
    });
  }

  // Increment counter
  record.count++;
}

/**
 * Gets the client IP from request headers
 * Supports X-Forwarded-For and X-Real-IP when TRUSTED_PROXY=true
 *
 * @param headers - Request headers
 * @returns Client IP address
 */
export function getClientIp(headers: Headers): string {
  if (process.env.TRUSTED_PROXY === 'true') {
    // Try X-Forwarded-For first (standard for proxies/load balancers)
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      // Get the first IP in the chain (original client)
      const firstIp = forwardedFor.split(',')[0]?.trim();
      if (firstIp) {
        return firstIp;
      }
    }

    // Fallback to X-Real-IP (used by some proxies like nginx)
    const realIp = headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }

    // Log warning if TRUSTED_PROXY is set but no header present
    logger.warn(
      'TRUSTED_PROXY=true but no X-Forwarded-For header. ' +
        'Rate limiting may be ineffective.'
    );
  }

  // Fallback: use a constant for development
  // In production behind a proxy, TRUSTED_PROXY should be set
  return 'unknown';
}

/**
 * Checks rate limit for a given key
 *
 * @param key - The rate limit key (e.g., IP address, email)
 * @param config - Rate limit configuration
 * @throws TRPCError with TOO_MANY_REQUESTS if limit exceeded
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    // Use Redis for distributed rate limiting
    await checkRateLimitRedis(redis, key, config);
  } else {
    // Fallback to in-memory (development only)
    checkRateLimitInMemory(key, config);
  }
}

/**
 * Creates a composite rate limit key for login
 * Combines IP and email for dual-key rate limiting
 *
 * @param ip - Client IP address
 * @param email - User email
 * @returns Composite key
 */
export function createLoginRateLimitKey(ip: string, email: string): string {
  return `login:${ip}:${email.toLowerCase()}`;
}

/**
 * Creates a rate limit key for registration
 *
 * @param ip - Client IP address
 * @returns Rate limit key
 */
export function createRegistrationRateLimitKey(ip: string): string {
  return `registration:${ip}`;
}

/**
 * Creates a rate limit key for password reset
 *
 * @param email - User email
 * @returns Rate limit key
 */
export function createPasswordResetRateLimitKey(email: string): string {
  return `password-reset:${email.toLowerCase()}`;
}

/**
 * Cleanup expired rate limit records (in-memory only)
 * Should be called periodically to prevent memory leaks
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of inMemoryStore) {
    if (now > record.resetAt) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup expired in-memory records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
}

/**
 * Resets rate limit for a key (for testing purposes)
 *
 * @param key - The rate limit key to reset
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    await redis.del(`rate_limit:${key}`);
  } else {
    inMemoryStore.delete(key);
  }
}

/**
 * Clears all rate limits (for testing purposes)
 */
export async function clearAllRateLimits(): Promise<void> {
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    // Delete all rate limit keys
    const keys = await redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } else {
    inMemoryStore.clear();
  }
}

/**
 * Gracefully close Redis connection (for testing and shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
