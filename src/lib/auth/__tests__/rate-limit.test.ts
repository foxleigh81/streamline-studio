/**
 * Rate Limiting Module Tests
 *
 * Tests rate limiting functionality for authentication endpoints.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  checkRateLimit,
  clearAllRateLimits,
  getClientIp,
  createLoginRateLimitKey,
  createRegistrationRateLimitKey,
  createPasswordResetRateLimitKey,
  RATE_LIMITS,
} from '../rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    clearAllRateLimits();
    // Reset environment
    vi.unstubAllEnvs();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const key = 'test-key';
      const config = { limit: 3, windowMs: 60000 };

      // Should not throw for first 3 requests
      await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
      await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
      await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
    });

    it('should block requests exceeding limit', async () => {
      const key = 'test-key';
      const config = { limit: 2, windowMs: 60000 };

      // Allow first 2 requests
      await checkRateLimit(key, config);
      await checkRateLimit(key, config);

      // Third request should be blocked
      await expect(checkRateLimit(key, config)).rejects.toThrow(TRPCError);
      await expect(checkRateLimit(key, config)).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('should reset after window expires', async () => {
      const key = 'test-key';
      const config = { limit: 1, windowMs: 100 }; // 100ms window

      // First request passes
      await checkRateLimit(key, config);

      // Second request should fail
      await expect(checkRateLimit(key, config)).rejects.toThrow();

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow again after window reset
      await expect(checkRateLimit(key, config)).resolves.toBeUndefined();
    });

    it('should track different keys independently', async () => {
      const config = { limit: 1, windowMs: 60000 };

      await checkRateLimit('key-1', config);
      await checkRateLimit('key-2', config);

      // First key should be blocked, second should have 1 attempt
      await expect(checkRateLimit('key-1', config)).rejects.toThrow();
      await expect(checkRateLimit('key-2', config)).rejects.toThrow();
    });
  });

  describe('getClientIp', () => {
    it('should return "unknown" without TRUSTED_PROXY', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1');

      const ip = getClientIp(headers);

      expect(ip).toBe('unknown');
    });

    it('should return forwarded IP with TRUSTED_PROXY=true', () => {
      vi.stubEnv('TRUSTED_PROXY', 'true');
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');

      const ip = getClientIp(headers);

      expect(ip).toBe('192.168.1.1');
    });

    it('should return "unknown" when TRUSTED_PROXY=true but no header', () => {
      vi.stubEnv('TRUSTED_PROXY', 'true');
      const headers = new Headers();

      const ip = getClientIp(headers);

      // Should return "unknown" when no forwarding headers are present
      expect(ip).toBe('unknown');
    });
  });

  describe('Rate limit key generation', () => {
    it('should create login rate limit key with IP and email', () => {
      const key = createLoginRateLimitKey('192.168.1.1', 'Test@Example.com');

      expect(key).toBe('login:192.168.1.1:test@example.com');
    });

    it('should create registration rate limit key with IP', () => {
      const key = createRegistrationRateLimitKey('192.168.1.1');

      expect(key).toBe('registration:192.168.1.1');
    });

    it('should create password reset rate limit key with email', () => {
      const key = createPasswordResetRateLimitKey('Test@Example.com');

      expect(key).toBe('password-reset:test@example.com');
    });
  });

  describe('Rate limit configurations', () => {
    it('should have correct login limits', () => {
      expect(RATE_LIMITS.login.limit).toBe(5);
      expect(RATE_LIMITS.login.windowMs).toBe(60 * 1000);
    });

    it('should have correct registration limits', () => {
      expect(RATE_LIMITS.registration.limit).toBe(3);
      expect(RATE_LIMITS.registration.windowMs).toBe(60 * 60 * 1000);
    });

    it('should have correct password reset limits', () => {
      expect(RATE_LIMITS.passwordReset.limit).toBe(3);
      expect(RATE_LIMITS.passwordReset.windowMs).toBe(60 * 60 * 1000);
    });

    it('should have correct general API limits', () => {
      expect(RATE_LIMITS.general.limit).toBe(100);
      expect(RATE_LIMITS.general.windowMs).toBe(60 * 1000);
    });
  });
});
