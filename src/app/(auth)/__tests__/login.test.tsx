/**
 * Login Form Integration Tests
 *
 * Tests for login form component including rendering, validation,
 * submission, error handling, loading states, and redirects.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import LoginPage from '../login/page';
import { trpc } from '@/lib/trpc/client';

// Create mocks for the router
const mockPush = vi.fn();
const mockRefresh = vi.fn();

// Mock next/navigation with custom router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock fetch for tRPC
const mockFetch = vi.fn();

describe('Login Form', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Reset mocks
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockFetch.mockReset();

    // Setup default fetch mock (successful response)
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            result: {
              type: 'data',
              data: { success: true },
            },
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    global.fetch = mockFetch;

    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  const renderLoginPage = () => {
    const trpcClient = trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    });

    return render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <LoginPage />
        </QueryClientProvider>
      </trpc.Provider>
    );
  };

  describe('Rendering', () => {
    it('should render login form', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign in/i })
      ).toBeInTheDocument();
    });

    it('should render link to registration page', () => {
      renderLoginPage();

      const link = screen.getByRole('link', { name: /create one/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/register');
    });

    it('should have proper form fields', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should render submit button', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Client-Side Validation', () => {
    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show errors for all empty fields', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call API on valid form submission', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should not submit when validation fails', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait a bit to ensure fetch is not called
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fetch should not have been called for login mutation
      // (might be called for other queries)
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('auth.login'),
        expect.anything()
      );
    });
  });

  describe('Server Error Display', () => {
    it('should display server error message', async () => {
      // Mock error response
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              error: {
                message: 'Invalid email or password',
                code: -32004,
                data: { code: 'UNAUTHORIZED' },
              },
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Authentication', () => {
    it('should redirect to home on successful login', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should refresh router after successful login', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderLoginPage();

      const form = screen
        .getByRole('button', { name: /sign in/i })
        .closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});
