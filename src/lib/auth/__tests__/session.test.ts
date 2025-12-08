/**
 * Session Module Tests
 *
 * Tests session token generation, parsing, and cookie handling.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateSessionToken,
  parseSessionToken,
  createSessionCookie,
  createBlankSessionCookie,
  SESSION_CONFIG,
} from '../session';

describe('Session Management', () => {
  describe('generateSessionToken', () => {
    it('should generate a non-empty token', () => {
      const token = generateSessionToken();

      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }

      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should generate tokens of consistent length', () => {
      const tokens = Array.from({ length: 10 }, () => generateSessionToken());
      const lengths = tokens.map((t) => t.length);

      // All tokens should have the same length (base32 encoding of 20 bytes)
      expect(new Set(lengths).size).toBe(1);
    });

    it('should only contain valid base32 characters', () => {
      const token = generateSessionToken();
      // Base32 lowercase no padding alphabet
      const validChars = /^[a-z2-7]+$/;

      expect(token).toMatch(validChars);
    });
  });

  describe('parseSessionToken', () => {
    it('should parse session token from cookie header', () => {
      const token = 'test-session-token';
      const cookieHeader = `${SESSION_CONFIG.cookieName}=${token}`;

      const result = parseSessionToken(cookieHeader);

      expect(result).toBe(token);
    });

    it('should parse token from multiple cookies', () => {
      const token = 'test-session-token';
      const cookieHeader = `other=value; ${SESSION_CONFIG.cookieName}=${token}; another=cookie`;

      const result = parseSessionToken(cookieHeader);

      expect(result).toBe(token);
    });

    it('should return null for empty cookie header', () => {
      expect(parseSessionToken('')).toBeNull();
      expect(parseSessionToken(null)).toBeNull();
    });

    it('should return null if session cookie is not present', () => {
      const cookieHeader = 'other=value; another=cookie';

      const result = parseSessionToken(cookieHeader);

      expect(result).toBeNull();
    });

    it('should return null for empty session cookie value', () => {
      const cookieHeader = `${SESSION_CONFIG.cookieName}=`;

      const result = parseSessionToken(cookieHeader);

      expect(result).toBeNull();
    });
  });

  describe('createSessionCookie', () => {
    it('should create a properly formatted cookie string', () => {
      const token = 'test-token';
      const cookie = createSessionCookie(token);

      expect(cookie).toContain(`${SESSION_CONFIG.cookieName}=${token}`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('should include Max-Age with default value', () => {
      const cookie = createSessionCookie('test-token');
      const expectedMaxAge = Math.floor(SESSION_CONFIG.expiresInMs / 1000);

      expect(cookie).toContain(`Max-Age=${expectedMaxAge}`);
    });

    it('should use custom Max-Age when provided', () => {
      const customMaxAge = 3600;
      const cookie = createSessionCookie('test-token', customMaxAge);

      expect(cookie).toContain(`Max-Age=${customMaxAge}`);
    });

    it('should include Secure flag in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const cookie = createSessionCookie('test-token');

      expect(cookie).toContain('Secure');
    });

    it('should not include Secure flag in development', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const cookie = createSessionCookie('test-token');

      expect(cookie).not.toContain('Secure');
    });
  });

  describe('createBlankSessionCookie', () => {
    it('should create a cookie that clears the session', () => {
      const cookie = createBlankSessionCookie();

      expect(cookie).toContain(`${SESSION_CONFIG.cookieName}=`);
      expect(cookie).toContain('Max-Age=0');
    });
  });

  describe('SESSION_CONFIG', () => {
    it('should have correct cookie name', () => {
      expect(SESSION_CONFIG.cookieName).toBe('session');
    });

    it('should have 30-day expiration', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(SESSION_CONFIG.expiresInMs).toBe(thirtyDaysMs);
    });

    it('should have 7-day renewal threshold', () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(SESSION_CONFIG.renewalThresholdMs).toBe(sevenDaysMs);
    });
  });
});
