/**
 * Authentication Module
 *
 * Exports all authentication-related functionality.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

export {
  SESSION_CONFIG,
  generateSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
  invalidateSessionByToken,
  invalidateUserSessionsExcept,
  invalidateAllUserSessions,
  createSessionCookie,
  createBlankSessionCookie,
  parseSessionToken,
  type SessionValidationResult,
} from './session';

export {
  PASSWORD_POLICY,
  validatePassword,
  hashPassword,
  verifyPassword,
  type PasswordValidationResult,
} from './password';

export {
  RATE_LIMITS,
  getClientIp,
  checkRateLimit,
  createLoginRateLimitKey,
  createRegistrationRateLimitKey,
  createPasswordResetRateLimitKey,
  cleanupExpiredRecords,
  resetRateLimit,
  clearAllRateLimits,
  type RateLimitConfig,
} from './rate-limit';
