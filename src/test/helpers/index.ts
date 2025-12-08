/**
 * Test Helpers Index
 *
 * Re-exports all test helper utilities for convenient importing.
 *
 * @example
 * ```typescript
 * import {
 *   getTestDatabase,
 *   createTestUser,
 *   createTestTRPCContext,
 * } from '@/test/helpers';
 * ```
 */

// Database helpers
export {
  getTestDatabase,
  closeTestDatabase,
  resetTestDatabase,
  createTestWorkspace,
  createTestUser,
  createTestUserWithWorkspace,
  createTestVideo,
  createTestCategory,
  createTestDocument,
  createTestSession,
  seedTestEnvironment,
} from './database';

// tRPC helpers
export {
  createTestTRPCContext,
  createMockRequest,
  createMockResponse,
  mockNextNavigation,
  waitFor,
  createDeferred,
  type TestTRPCContext,
  type CreateTestContextOptions,
} from './trpc';
