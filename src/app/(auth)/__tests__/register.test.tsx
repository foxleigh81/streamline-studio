/**
 * Register Form Integration Tests
 *
 * Tests for registration form component including rendering, validation,
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
import RegisterPage from '../register/page';
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
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock fetch for tRPC
const mockFetch = vi.fn();

describe('Register Form', () => {
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

  const renderRegisterPage = () => {
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
          <RegisterPage />
        </QueryClientProvider>
      </trpc.Provider>
    );
  };

  describe('Rendering', () => {
    it('should render registration form', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create account/i })
      ).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderRegisterPage();

      const link = screen.getByRole('link', { name: /sign in/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/login');
    });

    it('should have proper form fields', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/^name/i);
      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAttribute('name', 'name');
      expect(nameInput).toHaveAttribute('autocomplete', 'name');

      const emailInput = screen.getByLabelText(/^email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('name', 'confirmPassword');
      expect(confirmPasswordInput).toHaveAttribute(
        'autocomplete',
        'new-password'
      );
    });

    it('should show password requirements helper text', () => {
      renderRegisterPage();

      expect(
        screen.getByText(/must be at least 8 characters/i)
      ).toBeInTheDocument();
    });

    it('should mark name as optional', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/name.*optional/i)).toBeInTheDocument();
    });
  });

  describe('Client-Side Validation', () => {
    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is too short', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different456');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should show multiple validation errors', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

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
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/^name/i);
      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should not submit when validation fails', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.click(submitButton);

      // Wait a bit to ensure fetch is not called for mutation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('auth.register'),
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
                message: 'Email already registered',
                code: -32004,
                data: { code: 'CONFLICT' },
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
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Registration', () => {
    it('should redirect to home on successful registration', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should refresh router after successful registration', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', {
        name: /create account/i,
      });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderRegisterPage();

      const form = screen
        .getByRole('button', { name: /create account/i })
        .closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});
