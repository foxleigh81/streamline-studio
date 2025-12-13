/**
 * Next.js Middleware - Edge Runtime Compatible
 *
 * Implements CSRF protection via Origin header verification.
 *
 * NOTE: Setup wizard redirection is now handled in Server Component layouts:
 * - src/app/(app)/layout.tsx
 * - src/app/(auth)/layout.tsx
 * - src/app/setup/layout.tsx
 *
 * This middleware runs in the Edge Runtime and cannot use Node.js modules.
 *
 * @see /docs/adrs/007-api-and-auth.md - CSRF Protection
 * @see /docs/adrs/014-security-architecture.md - Security Architecture
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Verifies that the request Origin matches the Host
 *
 * @param origin - The Origin header value
 * @param allowedHosts - Array of allowed host values
 * @returns True if origin matches one of the allowed hosts
 */
function verifyRequestOrigin(origin: string, allowedHosts: string[]): boolean {
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    return allowedHosts.some((allowedHost) => {
      // Handle hosts with or without protocol
      const normalizedAllowed = allowedHost.includes('://')
        ? new URL(allowedHost).host
        : allowedHost;

      return originHost === normalizedAllowed;
    });
  } catch {
    // Invalid URL in origin
    return false;
  }
}

/**
 * Middleware - CSRF Protection Only
 *
 * Validates Origin header for all state-changing requests (POST, PUT, DELETE, PATCH).
 * Setup wizard redirection is now handled in Server Component layouts.
 *
 * @see ADR-014: CSRF Protection (Origin Header Verification)
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Allow GET, HEAD, OPTIONS without CSRF check
  if (
    request.method === 'GET' ||
    request.method === 'HEAD' ||
    request.method === 'OPTIONS'
  ) {
    return NextResponse.next();
  }

  // Get Origin header
  const originHeader = request.headers.get('Origin');

  // Get Host header (use X-Forwarded-Host if behind trusted proxy)
  const hostHeader =
    process.env.TRUSTED_PROXY === 'true'
      ? (request.headers.get('X-Forwarded-Host') ?? request.headers.get('Host'))
      : request.headers.get('Host');

  // Reject if Origin is missing (except for same-origin requests without Origin)
  if (!originHeader) {
    // Some browsers don't send Origin for same-origin requests
    // In this case, check Referer as fallback
    const referer = request.headers.get('Referer');

    if (referer && hostHeader) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host === hostHeader) {
          return NextResponse.next();
        }
      } catch {
        // Invalid referer URL - fall through to rejection
      }
    }

    // No Origin and no valid same-origin Referer - reject
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden - Missing Origin',
    });
  }

  // Verify Origin matches Host
  if (!hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden - Origin Mismatch',
    });
  }

  return NextResponse.next();
}

/**
 * Middleware configuration
 *
 * Apply to:
 * - /api/* routes (tRPC and other APIs)
 *
 * Exclude:
 * - Static files
 * - Next.js internals
 */
export const config = {
  matcher: [
    '/api/:path*',
    // Include other routes that accept POST (e.g., form submissions)
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
