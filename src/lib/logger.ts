/**
 * Structured Logging with Pino
 *
 * Provides structured JSON logging in production with pretty printing in development.
 * Automatically redacts sensitive data.
 *
 * @see https://github.com/pinojs/pino
 */

import pino from 'pino';

/**
 * Sensitive field patterns to redact from logs
 */
const REDACT_PATTERNS = [
  'password',
  'sessionToken',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'csrf',
];

/**
 * Get log level from environment or default to 'info'
 */
function getLogLevel(): pino.Level {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  const validLevels: pino.Level[] = [
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace',
  ];

  if (level && validLevels.includes(level as pino.Level)) {
    return level as pino.Level;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Create Pino logger instance
 */
export const logger = pino({
  level: getLogLevel(),

  // Redact sensitive fields
  redact: {
    paths: REDACT_PATTERNS,
    censor: '[REDACTED]',
  },

  // Base fields included in all logs
  base: {
    env: process.env.NODE_ENV,
  },

  // Pretty printing in development only
  // Disable in production and test environments to avoid worker thread issues
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

  // Format timestamps
  timestamp: pino.stdTimeFunctions.isoTime,

  // Serialize errors properly
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Create a child logger with additional context
 *
 * @example
 * ```typescript
 * const log = createLogger('video-service');
 * log.info({ videoId: '123' }, 'Processing video');
 * ```
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

/**
 * Log levels for convenience
 */
export const logLevels = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
} as const;

/**
 * Type guard for checking if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): object {
  if (isError(error)) {
    return {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    };
  }

  return {
    error: {
      message: String(error),
    },
  };
}
