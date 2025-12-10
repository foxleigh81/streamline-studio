/**
 * Next.js Middleware
 *
 * Implements:
 * 1. Setup wizard redirection (first-run detection)
 * 2. CSRF protection via Origin header verification
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/011-self-hosting-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSetupCompleteSync } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

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
 * Middleware
 *
 * Order of operations:
 * 1. Check if setup is complete, redirect to /setup if not (except for /setup and API routes)
 * 2. Apply CSRF protection for state-changing requests
 *
 * @see ADR-011: Self-Hosting Strategy (Setup Wizard)
 * @see ADR-014: CSRF Protection (Origin Header Verification)
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip setup check for:
  // - /setup page itself
  // - /api/health (health check)
  // - /api/trpc/setup.isComplete (needed by setup page)
  // - /api/trpc/setup.complete (needed to complete setup)
  // - Static files and Next.js internals
  const isSetupPath = pathname === '/setup';
  const isHealthCheck = pathname === '/api/health';
  const isSetupApiCall =
    pathname.startsWith('/api/trpc/setup.isComplete') ||
    pathname.startsWith('/api/trpc/setup.complete');
  const isStaticFile =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.');

  // In multi-tenant mode, skip setup wizard entirely
  const isMultiTenant = serverEnv.MODE === 'multi-tenant';

  if (!isMultiTenant) {
    // Single-tenant mode: enforce setup wizard
    // Check if setup is complete (only for non-exempt paths)
    if (!isSetupPath && !isHealthCheck && !isSetupApiCall && !isStaticFile) {
      const setupComplete = isSetupCompleteSync();

      if (!setupComplete) {
        // Redirect to setup wizard
        console.warn('[Middleware] Setup not complete, redirecting to /setup');
        return NextResponse.redirect(new URL('/setup', request.url));
      }
    }

    // If on setup page but setup is complete, redirect to home
    if (isSetupPath && isSetupCompleteSync()) {
      console.warn('[Middleware] Setup already complete, redirecting to home');
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    // Multi-tenant mode: setup wizard is disabled
    if (isSetupPath) {
      console.warn(
        '[Middleware] Setup wizard disabled in multi-tenant mode, redirecting to home'
      );
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

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
        // Invalid referer URL
      }
    }

    // No Origin and no valid same-origin Referer - reject
    console.warn('[CSRF] Request blocked: Missing Origin header', {
      path: request.nextUrl.pathname,
      method: request.method,
    });

    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden - Missing Origin',
    });
  }

  // Verify Origin matches Host
  if (!hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
    console.warn('[CSRF] Request blocked: Origin mismatch', {
      origin: originHeader,
      host: hostHeader,
      path: request.nextUrl.pathname,
    });

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
