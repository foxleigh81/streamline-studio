/**
 * Session Management
 *
 * Implements secure session token generation, validation, and management.
 * Based on Lucia Auth v3 patterns with custom implementation.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { db } from '@/server/db';
import { sessions, users } from '@/server/db/schema';
import type { Session, User } from '@/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';

/**
 * Session configuration
 * @see ADR-014: Session Management
 */
export const SESSION_CONFIG = {
  /** Session cookie name */
  cookieName: 'session',
  /** Session lifetime in milliseconds (30 days) */
  expiresInMs: 30 * 24 * 60 * 60 * 1000,
  /** Renewal threshold in milliseconds (7 days) */
  renewalThresholdMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Session validation result
 */
export interface SessionValidationResult {
  session: Session | null;
  user: User | null;
}

/**
 * Generates a cryptographically secure session token
 * Uses 32 bytes (256 bits) of random data encoded as base32
 *
 * @see ADR-014: Session tokens are 256-bit minimum
 * @returns Session token string
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32); // 256 bits per ADR-014
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Hashes a session token for storage
 * Uses SHA-256 to create a one-way hash
 *
 * @param token - The session token to hash
 * @returns Hex-encoded hash of the token
 */
function hashSessionToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = sha256(data);
  return encodeHexLowerCase(hash);
}

/**
 * Creates a new session for a user
 *
 * @param userId - The user's ID
 * @param token - The session token (generated via generateSessionToken)
 * @returns The created session
 */
export async function createSession(
  userId: string,
  token: string
): Promise<Session> {
  const sessionId = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_CONFIG.expiresInMs);

  const result = await db
    .insert(sessions)
    .values({
      id: sessionId,
      userId,
      expiresAt,
    })
    .returning();

  const session = result[0];
  if (!session) {
    throw new Error('Failed to create session');
  }

  return session;
}

/**
 * Validates a session token and returns the session and user
 *
 * @param token - The session token from the cookie
 * @returns Session and user if valid, null otherwise
 */
export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const sessionId = hashSessionToken(token);

  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = result[0];
  if (!row) {
    return { session: null, user: null };
  }

  const { session, user } = row;

  // Check if session has expired
  if (Date.now() >= session.expiresAt.getTime()) {
    await invalidateSession(sessionId);
    return { session: null, user: null };
  }

  // Extend session if it's close to expiring (within renewal threshold)
  const shouldRenew =
    Date.now() >=
    session.expiresAt.getTime() - SESSION_CONFIG.renewalThresholdMs;

  if (shouldRenew) {
    const newExpiresAt = new Date(Date.now() + SESSION_CONFIG.expiresInMs);
    await db
      .update(sessions)
      .set({ expiresAt: newExpiresAt })
      .where(eq(sessions.id, sessionId));

    return {
      session: { ...session, expiresAt: newExpiresAt },
      user,
    };
  }

  return { session, user };
}

/**
 * Invalidates a session by ID
 *
 * @param sessionId - The session ID (hashed token)
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Invalidates a session by token
 *
 * @param token - The session token from the cookie
 */
export async function invalidateSessionByToken(token: string): Promise<void> {
  const sessionId = hashSessionToken(token);
  await invalidateSession(sessionId);
}

/**
 * Invalidates all sessions for a user except the current one
 * Used when changing password
 *
 * @param userId - The user's ID
 * @param currentSessionId - The current session ID to preserve
 * @see ADR-014: Session Invalidation on Password Change
 */
export async function invalidateUserSessionsExcept(
  userId: string,
  currentSessionId: string
): Promise<void> {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)));
}

/**
 * Invalidates all sessions for a user
 *
 * @param userId - The user's ID
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Creates session cookie options
 *
 * @param token - The session token (empty string for deletion)
 * @param maxAge - Max age in seconds (0 for deletion)
 * @returns Cookie string for Set-Cookie header
 */
export function createSessionCookie(token: string, maxAge?: number): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieMaxAge = maxAge ?? Math.floor(SESSION_CONFIG.expiresInMs / 1000);

  const parts = [
    `${SESSION_CONFIG.cookieName}=${token}`,
    `Max-Age=${cookieMaxAge}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Creates a cookie that deletes the session
 *
 * @returns Cookie string for Set-Cookie header that deletes the session
 */
export function createBlankSessionCookie(): string {
  return createSessionCookie('', 0);
}

/**
 * Parses the session token from a cookie header
 *
 * @param cookieHeader - The Cookie header string
 * @returns The session token or null if not found
 */
export function parseSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) =>
    c.startsWith(`${SESSION_CONFIG.cookieName}=`)
  );

  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.substring(SESSION_CONFIG.cookieName.length + 1) || null;
}
