/**
 * Password Policy Constants
 *
 * Shared constants for password validation used by both client and server.
 * This file must remain free of server-only dependencies to allow client imports.
 *
 * @see /docs/adrs/014-security-architecture.md
 */

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  // Complexity NOT enforced (research shows length > complexity)
  requireUppercase: false,
  requireNumber: false,
  requireSpecial: false,
} as const;
