/**
 * Setup Detection and Management
 *
 * Handles first-run detection and setup completion tracking.
 * Uses file-based flag to persist across database wipes.
 *
 * ADR-011: Self-Hosting Packaging - First Run Experience
 * ADR-014: Security Architecture - Setup wizard must be locked after completion
 *
 * @see /docs/adrs/011-self-hosting-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { readFile, writeFile, mkdir, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from './logger';

const logger = createLogger('setup');

/**
 * Get the data directory path
 * Read at runtime to support environment variable changes after build
 */
function getDataDir(): string {
  return process.env.DATA_DIR || '/data';
}

/**
 * Get the path to the setup completion flag file
 * Stored outside database to persist across database resets
 */
function getSetupFlagPath(): string {
  return join(getDataDir(), '.setup-complete');
}

/**
 * Check if initial setup has been completed (synchronous)
 *
 * @returns True if setup is complete, false if first run
 */
export function isSetupCompleteSync(): boolean {
  try {
    return existsSync(getSetupFlagPath());
  } catch (error) {
    logger.error({ error }, 'Error checking setup status');
    // If we can't read the file, assume setup is not complete
    return false;
  }
}

/**
 * Check if initial setup has been completed (async wrapper for compatibility)
 *
 * @returns True if setup is complete, false if first run
 */
export async function isSetupComplete(): Promise<boolean> {
  return isSetupCompleteSync();
}

/**
 * Mark setup as complete
 *
 * Creates a persistent flag file to indicate setup has been completed.
 * This file should only be created after the first user is successfully created.
 *
 * @throws Error if file cannot be created
 */
export async function markSetupComplete(): Promise<void> {
  const dataDir = getDataDir();
  const flagPath = getSetupFlagPath();

  try {
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Write setup completion flag with timestamp
    const completionData = {
      completed: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await writeFile(flagPath, JSON.stringify(completionData, null, 2), 'utf-8');

    // Set file to read-only to prevent accidental deletion
    // 0o444 = r--r--r-- (read-only for all users)
    await chmod(flagPath, 0o444);

    logger.info(
      { timestamp: completionData.timestamp },
      'Setup marked as complete'
    );
  } catch (error) {
    logger.error({ error }, 'Error marking setup as complete');
    throw new Error('Failed to persist setup completion');
  }
}

/**
 * Get setup completion details
 *
 * @returns Setup completion metadata or null if not complete
 */
export async function getSetupDetails(): Promise<{
  completed: boolean;
  timestamp: string;
  version: string;
} | null> {
  const flagPath = getSetupFlagPath();

  try {
    if (!existsSync(flagPath)) {
      return null;
    }

    const content = await readFile(flagPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error({ error }, 'Error reading setup details');
    return null;
  }
}

/**
 * Validate that setup requirements are met
 *
 * Checks that all necessary environment variables are configured
 *
 * @returns Object with validation result and any error messages
 */
export function validateSetupRequirements(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is not configured');
  }

  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is not configured');
  }

  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
