/**
 * Password Hashing and Validation
 *
 * Implements secure password hashing with Argon2id and password policy validation.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { hash, verify } from '@node-rs/argon2';
import { COMMON_PASSWORDS } from './common-passwords';
import { PASSWORD_POLICY } from '@/lib/constants/password';

// Re-export PASSWORD_POLICY for backwards compatibility
export { PASSWORD_POLICY } from '@/lib/constants/password';

/**
 * Argon2id configuration
 * @see ADR-014: Argon2id Configuration
 */
const ARGON2_CONFIG = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a password against the password policy
 *
 * @param password - The password to validate
 * @returns Validation result with any errors
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(
      `Password must be at least ${PASSWORD_POLICY.minLength} characters`
    );
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(
      `Password must be less than ${PASSWORD_POLICY.maxLength} characters`
    );
  }

  // Check against common passwords (case-insensitive)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push(
      'This password is too common. Please choose a different password.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hashes a password using Argon2id
 *
 * @param password - The password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: ARGON2_CONFIG.memoryCost,
    timeCost: ARGON2_CONFIG.timeCost,
    parallelism: ARGON2_CONFIG.parallelism,
    outputLen: ARGON2_CONFIG.outputLen,
  });
}

/**
 * Verifies a password against a hash
 *
 * @param hash - The stored password hash
 * @param password - The password to verify
 * @returns True if the password matches
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    // Verification failed (invalid hash format, etc.)
    return false;
  }
}
