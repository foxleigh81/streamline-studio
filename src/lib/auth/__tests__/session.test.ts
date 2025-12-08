/**
 * Session Module Tests
 *
 * Tests session token generation, parsing, and cookie handling.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSessionToken,
  parseSessionToken,
  createSessionCookie,
  createBlankSessionCookie,
  SESSION_CONFIG,
  createSession,
  validateSessionToken,
  invalidateSession,
  invalidateSessionByToken,
  invalidateUserSessionsExcept,
  invalidateAllUserSessions,
} from '../session';
import {
  getTestDatabase,
  resetTestDatabase,
  createTestUser,
  isDatabaseAvailable,
} from '@/test/helpers/database';
import { eq } from 'drizzle-orm';
import * as schema from '@/server/db/schema';

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

/**
 * Database-dependent session tests
 * These tests require a running PostgreSQL database
 */
describe('Session Database Operations', () => {
  let dbAvailable = false;

  beforeEach(async (ctx) => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      ctx.skip();
      return;
    }
    await resetTestDatabase();
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    await resetTestDatabase();
  });

  describe('createSession', () => {
    it('should create session in database', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'session-test@example.com' });
      const token = generateSessionToken();

      const session = await createSession(user.id, token);

      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(session.expiresAt).toBeInstanceOf(Date);

      // Verify in database
      const [dbSession] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id));

      expect(dbSession).toBeDefined();
      expect(dbSession?.userId).toBe(user.id);
    });

    it('should set expiration date in the future', async () => {
      const user = await createTestUser({
        email: 'session-expiry@example.com',
      });
      const token = generateSessionToken();

      const session = await createSession(user.id, token);

      const now = Date.now();
      const expiresAt = session.expiresAt.getTime();

      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt).toBeLessThan(now + SESSION_CONFIG.expiresInMs + 1000);
    });

    it('should hash the token before storing', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'hash-test@example.com' });
      const token = generateSessionToken();

      await createSession(user.id, token);

      const [dbSession] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id));

      // Session ID should not equal the plain token
      expect(dbSession?.id).not.toBe(token);
      // Session ID should be a hex string (SHA-256 hash)
      expect(dbSession?.id).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateSessionToken', () => {
    it('should return session and user for valid token', async () => {
      const user = await createTestUser({ email: 'validate@example.com' });
      const token = generateSessionToken();
      await createSession(user.id, token);

      const result = await validateSessionToken(token);

      expect(result.session).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(user.id);
      expect(result.user?.email).toBe(user.email);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = generateSessionToken();

      const result = await validateSessionToken(invalidToken);

      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it('should invalidate expired sessions', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'expired@example.com' });
      const token = generateSessionToken();

      // Create session
      const session = await createSession(user.id, token);

      // Manually expire the session
      const expiredDate = new Date(Date.now() - 1000);
      await db
        .update(schema.sessions)
        .set({ expiresAt: expiredDate })
        .where(eq(schema.sessions.id, session.id));

      const result = await validateSessionToken(token);

      expect(result.session).toBeNull();
      expect(result.user).toBeNull();

      // Session should be deleted from database
      const [dbSession] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, session.id));

      expect(dbSession).toBeUndefined();
    });

    it('should extend session close to expiration', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'renewal@example.com' });
      const token = generateSessionToken();

      // Create session
      const session = await createSession(user.id, token);

      // Set expiration to within renewal threshold
      const expiresAt = new Date(
        Date.now() + SESSION_CONFIG.renewalThresholdMs - 1000
      );
      await db
        .update(schema.sessions)
        .set({ expiresAt })
        .where(eq(schema.sessions.id, session.id));

      const result = await validateSessionToken(token);

      expect(result.session).toBeDefined();
      expect(result.session?.expiresAt.getTime()).toBeGreaterThan(
        expiresAt.getTime()
      );
    });

    it('should not extend session far from expiration', async () => {
      const user = await createTestUser({ email: 'no-renewal@example.com' });
      const token = generateSessionToken();

      // Create fresh session (far from expiration)
      const session = await createSession(user.id, token);
      const originalExpiry = session.expiresAt.getTime();

      const result = await validateSessionToken(token);

      expect(result.session).toBeDefined();
      // Expiration should not change (within 1 second tolerance)
      expect(
        Math.abs(result.session!.expiresAt.getTime() - originalExpiry)
      ).toBeLessThan(1000);
    });
  });

  describe('invalidateSession', () => {
    it('should delete session by ID', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'invalidate@example.com' });
      const token = generateSessionToken();
      const session = await createSession(user.id, token);

      await invalidateSession(session.id);

      const [dbSession] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, session.id));

      expect(dbSession).toBeUndefined();
    });

    it('should not throw on non-existent session', async () => {
      const fakeSessionId = 'non-existent-session-id';

      await expect(invalidateSession(fakeSessionId)).resolves.not.toThrow();
    });
  });

  describe('invalidateSessionByToken', () => {
    it('should delete session by token', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({
        email: 'invalidate-token@example.com',
      });
      const token = generateSessionToken();
      const session = await createSession(user.id, token);

      await invalidateSessionByToken(token);

      const [dbSession] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, session.id));

      expect(dbSession).toBeUndefined();
    });
  });

  describe('invalidateUserSessionsExcept', () => {
    it('should invalidate all user sessions except current', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'multi-session@example.com' });

      // Create multiple sessions
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      const token3 = generateSessionToken();

      const session1 = await createSession(user.id, token1);
      await createSession(user.id, token2);
      await createSession(user.id, token3);

      // Invalidate all except session1
      await invalidateUserSessionsExcept(user.id, session1.id);

      const userSessions = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id));

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0]?.id).toBe(session1.id);
    });

    it('should handle user with no other sessions', async () => {
      const user = await createTestUser({
        email: 'single-session@example.com',
      });
      const token = generateSessionToken();
      const session = await createSession(user.id, token);

      await expect(
        invalidateUserSessionsExcept(user.id, session.id)
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      const db = await getTestDatabase();
      const user = await createTestUser({ email: 'clear-all@example.com' });

      // Create multiple sessions
      await createSession(user.id, generateSessionToken());
      await createSession(user.id, generateSessionToken());
      await createSession(user.id, generateSessionToken());

      await invalidateAllUserSessions(user.id);

      const userSessions = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user.id));

      expect(userSessions).toHaveLength(0);
    });

    it('should not affect other users sessions', async () => {
      const db = await getTestDatabase();
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });

      await createSession(user1.id, generateSessionToken());
      const session2 = await createSession(user2.id, generateSessionToken());

      await invalidateAllUserSessions(user1.id);

      const user2Sessions = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, user2.id));

      expect(user2Sessions).toHaveLength(1);
      expect(user2Sessions[0]?.id).toBe(session2.id);
    });

    it('should handle user with no sessions', async () => {
      const user = await createTestUser({ email: 'no-sessions@example.com' });

      await expect(invalidateAllUserSessions(user.id)).resolves.not.toThrow();
    });
  });
});
