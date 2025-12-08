/**
 * MSW Request Handlers
 *
 * Provides mock handlers for API requests during testing.
 * These handlers intercept network requests and return mock responses.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { http, HttpResponse } from 'msw';

/**
 * Mock user data
 */
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
};

/**
 * Mock workspace data
 */
const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  slug: 'test-workspace',
  mode: 'single-tenant' as const,
};

/**
 * Mock video data
 */
const mockVideos = [
  {
    id: 'video-1',
    workspaceId: mockWorkspace.id,
    title: 'Test Video 1',
    description: 'A test video',
    status: 'idea' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'video-2',
    workspaceId: mockWorkspace.id,
    title: 'Test Video 2',
    description: 'Another test video',
    status: 'scripting' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Auth handlers
 */
export const authHandlers = [
  // GET /api/trpc/auth.me
  http.get('/api/trpc/auth.me', () => {
    return HttpResponse.json({
      result: {
        data: mockUser,
      },
    });
  }),

  // POST /api/trpc/auth.login
  http.post('/api/trpc/auth.login', async ({ request }) => {
    const body = await request.json();
    const input = (
      body as { '0': { json: { email: string; password: string } } }
    )['0']?.json;

    // Simulate invalid credentials
    if (input?.password === 'wrong-password') {
      return HttpResponse.json(
        {
          error: {
            message: 'Invalid email or password.',
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      result: {
        data: {
          success: true,
          message: 'Login successful.',
        },
      },
    });
  }),

  // POST /api/trpc/auth.register
  http.post('/api/trpc/auth.register', async ({ request }) => {
    const body = await request.json();
    const input = (
      body as { '0': { json: { email: string; password: string } } }
    )['0']?.json;

    // Simulate weak password error
    if (input?.password && input.password.length < 8) {
      return HttpResponse.json(
        {
          error: {
            message: 'Password must be at least 8 characters.',
            code: 'BAD_REQUEST',
          },
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      result: {
        data: {
          success: true,
          message: 'Account created successfully.',
        },
      },
    });
  }),

  // POST /api/trpc/auth.logout
  http.post('/api/trpc/auth.logout', () => {
    return HttpResponse.json({
      result: {
        data: {
          success: true,
          message: 'Logged out successfully.',
        },
      },
    });
  }),
];

/**
 * Health check handlers
 */
export const healthHandlers = [
  // GET /api/health
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/trpc/health
  http.get('/api/trpc/health', () => {
    return HttpResponse.json({
      result: {
        data: {
          status: 'ok',
          database: 'connected',
        },
      },
    });
  }),
];

/**
 * Video handlers
 */
export const videoHandlers = [
  // GET /api/trpc/video.list
  http.get('/api/trpc/video.list', () => {
    return HttpResponse.json({
      result: {
        data: mockVideos,
      },
    });
  }),

  // GET /api/trpc/video.get
  http.get('/api/trpc/video.get', ({ request }) => {
    const url = new URL(request.url);
    const input = url.searchParams.get('input');

    if (input) {
      const parsedInput = JSON.parse(input);
      const video = mockVideos.find((v) => v.id === parsedInput.id);

      if (video) {
        return HttpResponse.json({
          result: {
            data: video,
          },
        });
      }
    }

    return HttpResponse.json(
      {
        error: {
          message: 'Video not found',
          code: 'NOT_FOUND',
        },
      },
      { status: 404 }
    );
  }),
];

/**
 * All handlers combined
 */
export const handlers = [...authHandlers, ...healthHandlers, ...videoHandlers];

/**
 * Create handlers for a specific authenticated user
 */
export function createAuthenticatedHandlers(user: {
  id: string;
  email: string;
  name?: string;
}) {
  return [
    http.get('/api/trpc/auth.me', () => {
      return HttpResponse.json({
        result: {
          data: user,
        },
      });
    }),
  ];
}

/**
 * Create handlers that simulate an unauthenticated state
 */
export function createUnauthenticatedHandlers() {
  return [
    http.get('/api/trpc/auth.me', () => {
      return HttpResponse.json({
        result: {
          data: null,
        },
      });
    }),
  ];
}

/**
 * Create handlers that simulate API errors
 */
export function createErrorHandlers(statusCode: number, message: string) {
  return [
    http.get('/api/trpc/*', () => {
      return HttpResponse.json(
        {
          error: {
            message,
            code: statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR',
          },
        },
        { status: statusCode }
      );
    }),
    http.post('/api/trpc/*', () => {
      return HttpResponse.json(
        {
          error: {
            message,
            code: statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR',
          },
        },
        { status: statusCode }
      );
    }),
  ];
}
