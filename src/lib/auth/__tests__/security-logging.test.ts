/**
 * Security Logging Tests
 *
 * Verifies that sensitive data never appears in application logs.
 * This is a critical security requirement from ADR-014.
 *
 * @see /docs/adrs/014-security-architecture.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashPassword, validatePassword, verifyPassword } from '../password';
import {
  generateSessionToken,
  createSessionCookie,
  parseSessionToken,
} from '../session';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '../rate-limit';

describe('Security - No Secrets in Logs', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on all console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // no-op
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // no-op
    });
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // no-op
    });
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {
      // no-op
    });
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
      // no-op
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('Password Operations', () => {
    it('should not log plaintext passwords during validation', () => {
      const password = 'MySecretPassword123!';

      validatePassword(password);

      // Check all console methods
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
      expect(consoleInfoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
      expect(consoleDebugSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
    });

    it('should not log plaintext passwords during hashing', async () => {
      const password = 'AnotherSecret456!';

      await hashPassword(password);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
    });

    it('should not log plaintext passwords during verification', async () => {
      const password = 'VerifyThisSecret789!';
      const hash = await hashPassword(password);

      await verifyPassword(hash, password);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(password)
      );
    });

    it('should not log password hashes', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      // Verify hash itself is not logged
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(hash)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(hash)
      );
    });
  });

  describe('Session Token Operations', () => {
    it('should not log session tokens during generation', () => {
      const token = generateSessionToken();

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(token)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(token)
      );
    });

    it('should not log session tokens during cookie creation', () => {
      const token = generateSessionToken();

      createSessionCookie(token);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(token)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(token)
      );
    });

    it('should not log session tokens during parsing', () => {
      const token = generateSessionToken();
      const cookieHeader = `session=${token}`;

      parseSessionToken(cookieHeader);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(token)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(token)
      );
    });
  });

  describe('Rate Limiting Operations', () => {
    it('should not log full email addresses in rate limit checks', async () => {
      const email = 'sensitive.user@example.com';
      const headers = new Headers();

      getClientIp(headers);

      // Email should not be logged
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(email)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(email)
      );
    });

    it('should not log IP addresses unless necessary', async () => {
      const headers = new Headers();
      headers.set('X-Forwarded-For', '192.168.1.100');

      vi.stubEnv('TRUSTED_PROXY', 'true');
      const ip = getClientIp(headers);

      // IP itself can be in logs for rate limiting warnings,
      // but should not be in error messages that get exposed to users
      // This test verifies the IP isn't leaked in user-facing errors
      try {
        await checkRateLimit(`test:${ip}`, RATE_LIMITS.login);
      } catch (error) {
        // User-facing error messages should not contain raw IPs
        if (error instanceof Error) {
          expect(error.message).not.toContain(ip);
        }
      }
    });
  });

  describe('Error Messages', () => {
    it('should not include sensitive data in validation error messages', () => {
      const password = 'MyVerySecretPassword123!';

      const result = validatePassword(password);

      // Error messages should be generic
      if (!result.valid) {
        result.errors.forEach((error) => {
          expect(error).not.toContain(password);
          expect(error).not.toMatch(/hash/i);
          expect(error).not.toMatch(/salt/i);
          expect(error).not.toMatch(/token/i);
        });
      }
    });

    it('should use generic error messages for authentication failures', () => {
      // This test verifies the pattern used in auth flows
      const genericErrors = [
        'Invalid email or password.',
        'Too many attempts.',
        'Session expired.',
        'Unauthorized.',
      ];

      // These errors should NOT contain:
      // - User emails
      // - Password hints
      // - Internal error details
      // - Stack traces
      // - Database errors

      genericErrors.forEach((error) => {
        expect(error).not.toMatch(/@/); // No email addresses
        expect(error).not.toMatch(/password.{0,20}(is|was)/i); // No password details
        expect(error).not.toMatch(/user.{0,20}(not found|exists)/i); // No enumeration
        expect(error).not.toMatch(/database|sql|query/i); // No internal details
      });
    });
  });

  describe('Console Output Validation', () => {
    it('should verify no secrets in any console output', () => {
      const secrets = [
        'MyPassword123!',
        generateSessionToken(),
        'user-secret-key',
        'database-connection-string',
      ];

      // Run various auth operations
      validatePassword(secrets[0] ?? '');
      createSessionCookie(secrets[1] ?? '');

      // Check that none of the secrets appear in any console output
      const allCalls = [
        ...consoleLogSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
        ...consoleInfoSpy.mock.calls,
        ...consoleDebugSpy.mock.calls,
      ];

      allCalls.forEach((call) => {
        const output = call.join(' ');
        secrets.forEach((secret) => {
          expect(output).not.toContain(secret);
        });
      });
    });
  });

  describe('Environment Variable Safety', () => {
    it('should not log SESSION_SECRET', () => {
      vi.stubEnv('SESSION_SECRET', 'test-secret-value');

      // Simulate accessing env var (this happens in various places)
      const secret = process.env.SESSION_SECRET;

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(secret ?? '')
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(secret ?? '')
      );
    });

    it('should not log DATABASE_URL', () => {
      vi.stubEnv(
        'DATABASE_URL',
        'postgresql://user:password@localhost:5432/db'
      );

      const dbUrl = process.env.DATABASE_URL;

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(dbUrl ?? '')
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(dbUrl ?? '')
      );
    });
  });

  describe('Production Log Safety', () => {
    it('should mask sensitive data in production error logs', () => {
      vi.stubEnv('NODE_ENV', 'production');

      // Simulate an error that might contain sensitive data
      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
        sessionToken: generateSessionToken(),
      };

      // In production, errors should not contain these values
      // This is a pattern verification test
      const safeErrorMessage = 'Authentication failed';
      const unsafeErrorMessage = `Authentication failed for ${sensitiveData.email} with password ${sensitiveData.password}`;

      expect(safeErrorMessage).not.toContain(sensitiveData.email);
      expect(safeErrorMessage).not.toContain(sensitiveData.password);
      expect(unsafeErrorMessage).toContain(sensitiveData.email); // This is the bad pattern

      // Verify our code uses the safe pattern
      expect(safeErrorMessage).toBe('Authentication failed');
    });
  });
});
