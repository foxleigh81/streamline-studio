'use client';

/**
 * Global Error Page
 *
 * This is a special error boundary that wraps the entire application,
 * including the root layout. It only activates when errors occur in
 * the root layout itself.
 *
 * Note: This component must include its own <html> and <body> tags
 * because it replaces the root layout when active.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log critical error (will be replaced with structured logging in Phase 4)
  console.error('CRITICAL: Global error:', error);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
          <div className="w-full max-w-md rounded-lg border border-red-800 bg-gray-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-900">
                <svg
                  className="h-6 w-6 text-red-300"
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
                <h1 className="text-xl font-semibold text-white">
                  Critical Error
                </h1>
                <p className="text-sm text-gray-400">
                  The application encountered a critical error
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-md bg-gray-900 p-4">
              <p className="mb-2 text-sm font-medium text-gray-300">
                Error details:
              </p>
              <p className="font-mono text-sm text-gray-400">
                {error.message || 'A critical error occurred'}
              </p>
              {error.digest && (
                <p className="mt-2 font-mono text-xs text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="mb-4 rounded-md bg-yellow-900 bg-opacity-50 p-4">
              <p className="text-sm text-yellow-200">
                This is a critical system error. Reloading the page may help,
                but if the problem persists, please contact support.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                type="button"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                type="button"
              >
                Go Home
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href="https://github.com/foxleigh81/streamline-studio/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                Report this critical issue
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
