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

  // Redis (optional in development, recommended for production)
  REDIS_URL: z.string().url().optional(),

  // Rate limiting behavior when Redis is unavailable
  // 'true' = fail closed (deny requests), 'false' = fail open (allow requests)
  RATE_LIMIT_FAIL_CLOSED: z
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

  // YouTube Integration (Phase 6 - optional)
  // Required only if YouTube features are enabled
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REDIRECT_URI: z.string().url().optional(),
  YOUTUBE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(
      64,
      'YOUTUBE_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'
    )
    .regex(
      /^[0-9a-fA-F]+$/,
      'YOUTUBE_TOKEN_ENCRYPTION_KEY must be a hex string'
    )
    .optional(),

  // YouTube Quota (optional, for multi-tenant deployments)
  YOUTUBE_QUOTA_PER_WORKSPACE: z
    .string()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .optional(),
  YOUTUBE_SYNC_INTERVAL_HOURS: z
    .string()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .optional(),
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
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(', ')}`)
      .join('\n');

    console.error('\n❌ Environment validation failed:');
    console.error(errorMessages);
    console.error('\nRequired environment variables are missing or invalid.');
    console.error('');
    console.error('For local development:');
    console.error('  1. Copy .env.example to .env');
    console.error('     cp .env.example .env');
    console.error('  2. Fill in the required values');
    console.error('  3. Generate secrets:');
    console.error('     openssl rand -base64 24  # For POSTGRES_PASSWORD');
    console.error('     openssl rand -base64 32  # For SESSION_SECRET');
    console.error('');
    console.error('For production:');
    console.error(
      '  Ensure all required environment variables are set in your deployment.'
    );
    console.error('');
    console.error('See .env.example for complete documentation.');
    console.error('');

    throw new Error('Environment validation failed. See error messages above.');
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
