'use client';

import { useRouter } from 'next/navigation';

/**
 * Videos Route Error Page
 *
 * Error boundary for the videos list and detail pages.
 * Provides context-specific error handling with navigation back to workspace.
 */
export default function VideosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Log error (will be replaced with structured logging in Phase 4)
  console.error('Videos page error:', error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Videos Error
            </h2>
            <p className="text-sm text-gray-600">
              There was a problem loading videos
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-md bg-gray-50 p-4">
          <p className="font-mono text-sm text-gray-700">
            {error.message || 'Failed to load videos'}
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
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="button"
          >
            Go Back
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          If this problem persists,{' '}
          <a
            href="https://github.com/foxleigh81/streamline-studio/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            report this issue
          </a>
        </p>
      </div>
    </div>
  );
}
