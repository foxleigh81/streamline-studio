/**
 * tRPC Test Utilities
 *
 * Provides utilities for testing tRPC routers and procedures.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { vi } from 'vitest';
import type { inferAsyncReturnType } from '@trpc/server';
import {
  getTestDatabase,
  resetTestDatabase,
  createTestUserWithWorkspace,
} from './database';
import type { User, Project } from '@/server/db/schema';

/**
 * Test context type
 */
export interface TestTRPCContext {
  db: inferAsyncReturnType<typeof getTestDatabase>;
  user: User | null;
  workspace: Project | null;
  headers: Headers;
  req: {
    headers: Headers;
  };
  cleanup: () => Promise<void>;
}

/**
 * Options for creating a test tRPC context
 */
export interface CreateTestContextOptions {
  /** Whether the context should have an authenticated user */
  authenticated?: boolean;
  /** Whether the user should have a workspace */
  hasWorkspace?: boolean;
  /** Custom user email */
  email?: string;
  /** Custom user password */
  password?: string;
  /** Custom workspace name */
  workspaceName?: string;
  /** User role in workspace */
  role?: 'owner' | 'editor' | 'viewer';
  /** Additional headers to include */
  additionalHeaders?: Record<string, string>;
}

/**
 * Create a test tRPC context
 *
 * This simulates the context that would be passed to tRPC procedures.
 *
 * @example
 * ```typescript
 * const ctx = await createTestTRPCContext({ authenticated: true });
 * const result = await ctx.caller.auth.me();
 * await ctx.cleanup();
 * ```
 */
export async function createTestTRPCContext(
  options: CreateTestContextOptions = {}
): Promise<TestTRPCContext> {
  const db = await getTestDatabase();
  const headers = new Headers();

  // Add any additional headers
  if (options.additionalHeaders) {
    Object.entries(options.additionalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  let user: User | null = null;
  let workspace: Project | null = null;

  if (options.authenticated) {
    if (options.hasWorkspace !== false) {
      const result = await createTestUserWithWorkspace({
        email: options.email ?? 'test@example.com',
        password: options.password ?? 'testpassword123',
        workspaceName: options.workspaceName,
        role: options.role,
      });
      user = result.user;
      workspace = result.workspace;
    } else {
      // Create user without workspace
      const { createTestUser } = await import('./database');
      user = await createTestUser({
        email: options.email,
        password: options.password,
      });
    }
  }

  return {
    db,
    user,
    workspace,
    headers,
    req: {
      headers,
    },
    cleanup: async () => {
      await resetTestDatabase();
    },
  };
}

/**
 * Create a mock request object for testing
 */
export function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
) {
  const headers = new Headers(options.headers);

  // Add cookies if provided
  if (options.cookies) {
    const cookieString = Object.entries(options.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    headers.set('cookie', cookieString);
  }

  return {
    method: options.method ?? 'GET',
    url: options.url ?? 'http://localhost:3000/api/trpc',
    headers,
  };
}

/**
 * Create a mock response object for testing
 */
export function createMockResponse() {
  const headers = new Headers();
  const cookiesSet: string[] = [];

  return {
    headers,
    cookies: cookiesSet,
    setCookie: (
      name: string,
      value: string,
      options?: Record<string, unknown>
    ) => {
      let cookieString = `${name}=${value}`;
      if (options) {
        if (options.httpOnly) cookieString += '; HttpOnly';
        if (options.secure) cookieString += '; Secure';
        if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
        if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
        if (options.path) cookieString += `; Path=${options.path}`;
      }
      cookiesSet.push(cookieString);
      headers.append('Set-Cookie', cookieString);
    },
  };
}

/**
 * Mock the next/navigation module for testing
 */
export function mockNextNavigation() {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };

  const mockUseRouter = vi.fn(() => mockRouter);
  const mockUsePathname = vi.fn(() => '/test');
  const mockUseSearchParams = vi.fn(() => new URLSearchParams());
  const mockUseParams = vi.fn(() => ({}));

  vi.mock('next/navigation', () => ({
    useRouter: mockUseRouter,
    usePathname: mockUsePathname,
    useSearchParams: mockUseSearchParams,
    useParams: mockUseParams,
  }));

  return {
    mockRouter,
    mockUseRouter,
    mockUsePathname,
    mockUseSearchParams,
    mockUseParams,
  };
}

/**
 * Wait for a condition to be true (useful for async tests)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}
