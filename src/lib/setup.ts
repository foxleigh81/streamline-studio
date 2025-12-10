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

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Path to the setup completion flag file
 * Stored outside database to persist across database resets
 */
const DATA_DIR = process.env.DATA_DIR || '/data';
const SETUP_FLAG_PATH = join(DATA_DIR, '.setup-complete');

/**
 * Check if initial setup has been completed (synchronous)
 *
 * @returns True if setup is complete, false if first run
 */
export function isSetupCompleteSync(): boolean {
  try {
    return existsSync(SETUP_FLAG_PATH);
  } catch (error) {
    console.error('[Setup] Error checking setup status:', error);
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
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    // Write setup completion flag with timestamp
    const completionData = {
      completed: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await writeFile(
      SETUP_FLAG_PATH,
      JSON.stringify(completionData, null, 2),
      'utf-8'
    );

    console.warn('[Setup] Setup marked as complete');
  } catch (error) {
    console.error('[Setup] Error marking setup as complete:', error);
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
  try {
    if (!existsSync(SETUP_FLAG_PATH)) {
      return null;
    }

    const content = await readFile(SETUP_FLAG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[Setup] Error reading setup details:', error);
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
