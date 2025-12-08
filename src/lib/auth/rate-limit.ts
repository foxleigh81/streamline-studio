/**
 * Rate Limiting
 *
 * Implements in-memory rate limiting for authentication endpoints.
 * Uses a sliding window algorithm with configurable limits.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { TRPCError } from '@trpc/server';

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
 * Rate limit record for tracking requests
 */
interface RateLimitRecord {
  /** Number of requests in the current window */
  count: number;
  /** Timestamp when the window resets */
  resetAt: number;
}

/**
 * In-memory rate limit store
 * Note: This resets on server restart. For production with multiple
 * instances, consider Redis-based rate limiting.
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

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
 * Gets the client IP from request headers
 * Supports X-Forwarded-For when TRUSTED_PROXY=true
 *
 * @param headers - Request headers
 * @returns Client IP address
 */
export function getClientIp(headers: Headers): string {
  if (process.env.TRUSTED_PROXY === 'true') {
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      // Get the first IP in the chain (original client)
      const firstIp = forwardedFor.split(',')[0]?.trim();
      if (firstIp) {
        return firstIp;
      }
    }

    // Log warning if TRUSTED_PROXY is set but no header present
    if (!forwardedFor) {
      console.warn(
        '[Security] TRUSTED_PROXY=true but no X-Forwarded-For header. ' +
          'Rate limiting may be ineffective.'
      );
    }
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
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // No existing record or window expired - create new
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
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
 * Cleanup expired rate limit records
 * Should be called periodically to prevent memory leaks
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup expired records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
}

/**
 * Resets rate limit for a key (for testing purposes)
 *
 * @param key - The rate limit key to reset
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clears all rate limits (for testing purposes)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
