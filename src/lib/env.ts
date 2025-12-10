import { z } from 'zod';

/**
 * Environment Variable Validation
 *
 * Validates all environment variables at runtime using Zod.
 * This ensures type safety and fails fast if required variables are missing.
 *
 * @see /docs/adrs/011-self-hosting-strategy.md for variable documentation
 */

/**
 * Server-side environment variables schema.
 * These are only available on the server.
 */
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid URL'),

  // Session
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Mode (default: single-tenant for self-hosted)
  MODE: z.enum(['single-tenant', 'multi-tenant']).default('single-tenant'),

  // SMTP configuration (required for multi-tenant invitation emails)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Proxy settings
  TRUSTED_PROXY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Data directory for setup flag
  DATA_DIR: z.string().default('/data'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Port (optional)
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3000'),
});

/**
 * Client-side environment variables schema.
 * These are prefixed with NEXT_PUBLIC_ and are exposed to the browser.
 */
const clientEnvSchema = z.object({
  // Add public env vars here as needed
  // NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/**
 * Validate server environment variables.
 * Call this at application startup.
 */
function validateServerEnv() {
  // In development, provide helpful defaults
  const envWithDefaults =
    process.env.NODE_ENV === 'development'
      ? {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ??
            'postgresql://streamline:password@localhost:5432/streamline',
          SESSION_SECRET:
            process.env.SESSION_SECRET ??
            'development-secret-change-in-production-32chars',
        }
      : process.env;

  const result = serverEnvSchema.safeParse(envWithDefaults);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(', ')}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\nSee .env.example for required variables.`
    );
  }

  return result.data;
}

/**
 * Validate client environment variables.
 */
function validateClientEnv() {
  const result = clientEnvSchema.safeParse({
    // Map NEXT_PUBLIC_ vars here
  });

  if (!result.success) {
    throw new Error(
      `Client environment validation failed: ${result.error.message}`
    );
  }

  return result.data;
}

/**
 * Server environment variables (validated).
 * Only use this in server-side code.
 */
export const serverEnv = validateServerEnv();

/**
 * Client environment variables (validated).
 * Safe to use in client-side code.
 */
export const clientEnv = validateClientEnv();

/**
 * Type for server environment variables.
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Type for client environment variables.
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;
