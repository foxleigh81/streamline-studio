/**
 * Password Module Tests
 *
 * Tests password validation and hashing functionality.
 *
 * @see /docs/adrs/014-security-architecture.md
 */

import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  PASSWORD_POLICY,
} from '../password';

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than minimum length', () => {
      const result = validatePassword('short');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Password must be at least ${PASSWORD_POLICY.minLength} characters`
      );
    });

    it('should reject passwords longer than maximum length', () => {
      const longPassword = 'a'.repeat(129);
      const result = validatePassword(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Password must be less than ${PASSWORD_POLICY.maxLength} characters`
      );
    });

    it('should reject common passwords', () => {
      const commonPasswords = ['password', '12345678', 'qwerty123'];

      for (const password of commonPasswords) {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'This password is too common. Please choose a different password.'
        );
      }
    });

    it('should accept valid passwords', () => {
      const validPasswords = [
        'correcthorsebatterystaple',
        'mY$ecureP@ssw0rd!123',
        'thisisa-validpassword2024',
        'randomlygeneratedpassword',
      ];

      for (const password of validPasswords) {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should be case-insensitive for common password check', () => {
      const result = validatePassword('PASSWORD');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'This password is too common. Please choose a different password.'
      );
    });

    it('should accept passwords at exactly minimum length', () => {
      const password = 'a'.repeat(PASSWORD_POLICY.minLength);
      const result = validatePassword(password);

      expect(result.valid).toBe(true);
    });

    it('should accept passwords at exactly maximum length', () => {
      const password = 'a'.repeat(PASSWORD_POLICY.maxLength);
      const result = validatePassword(password);

      expect(result.valid).toBe(true);
    });

    it('should return multiple errors if multiple rules are violated', () => {
      // "pass" is both too short AND too common
      const result = validatePassword('pass');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should return a non-empty hash', async () => {
      const hash = await hashPassword('testpassword123');

      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should return different hashes for the same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should return a properly formatted Argon2 hash', async () => {
      const hash = await hashPassword('testpassword123');

      // Argon2 hashes start with $argon2
      expect(hash).toMatch(/^\$argon2/);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('correctpassword');

      const isValid = await verifyPassword(hash, 'wrongpassword');

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('invalid-hash', 'anypassword');

      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('testpassword');

      const isValid = await verifyPassword(hash, '');

      expect(isValid).toBe(false);
    });
  });
});

describe('Password Policy', () => {
  it('should have correct policy values', () => {
    expect(PASSWORD_POLICY.minLength).toBe(8);
    expect(PASSWORD_POLICY.maxLength).toBe(128);
    expect(PASSWORD_POLICY.requireUppercase).toBe(false);
    expect(PASSWORD_POLICY.requireNumber).toBe(false);
    expect(PASSWORD_POLICY.requireSpecial).toBe(false);
  });
});
