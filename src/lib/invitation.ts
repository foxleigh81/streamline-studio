/**
 * Invitation Token Generation and Validation
 *
 * Handles secure token generation for workspace invitations.
 *
 * @see /docs/planning/app-planning-phases.md Phase 5.2
 * @see /docs/adrs/014-security-architecture.md
 */

import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generate a secure 256-bit invitation token
 *
 * @returns 64-character hexadecimal string
 */
export function generateInvitationToken(): string {
  // Generate 32 bytes (256 bits) of random data
  const buffer = randomBytes(32);
  // Convert to hexadecimal string (64 characters)
  return buffer.toString('hex');
}

/**
 * Calculate invitation expiry time (24 hours from now)
 *
 * @returns Date object set to 24 hours in the future
 */
export function calculateInvitationExpiry(): Date {
  const now = new Date();
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  return expiry;
}

/**
 * Check if an invitation has expired
 *
 * @param expiresAt - The expiration date of the invitation
 * @returns true if expired, false otherwise
 */
export function isInvitationExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Check if invitation attempts have been exceeded
 *
 * @param attempts - Current number of attempts
 * @param maxAttempts - Maximum allowed attempts (default: 3)
 * @returns true if attempts exceeded, false otherwise
 */
export function hasExceededAttempts(
  attempts: number,
  maxAttempts: number = 3
): boolean {
  return attempts >= maxAttempts;
}

/**
 * Compare two invitation tokens using constant-time comparison
 *
 * This prevents timing attacks where an attacker could determine
 * parts of a valid token by measuring response times.
 *
 * @param tokenA - First token to compare
 * @param tokenB - Second token to compare
 * @returns true if tokens match, false otherwise
 */
export function compareTokensConstantTime(
  tokenA: string,
  tokenB: string
): boolean {
  // Ensure both tokens are the same length (64 characters)
  // This is a fast check and doesn't leak timing information about correctness
  if (tokenA.length !== 64 || tokenB.length !== 64) {
    return false;
  }

  try {
    // Convert hex strings to buffers
    const bufferA = Buffer.from(tokenA, 'hex');
    const bufferB = Buffer.from(tokenB, 'hex');

    // Use Node.js crypto.timingSafeEqual for constant-time comparison
    // This function takes the same amount of time regardless of where the difference is
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    // If conversion fails (invalid hex), return false
    return false;
  }
}
