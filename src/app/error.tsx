'use client';

import Link from 'next/link';

/**
 * Root Error Page
 *
 * This error boundary catches errors in the root app layout and all child routes.
 * It provides a user-friendly error message with retry and reporting capabilities.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error for debugging (will be replaced with structured logging in Phase 4)
  console.error('Application error:', error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-600">
              An unexpected error occurred
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-md bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Error details:
          </p>
          <p className="font-mono text-sm text-gray-600">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://github.com/foxleigh81/streamline-studio/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Report this issue
          </a>
        </div>
      </div>
    </div>
  );
}
