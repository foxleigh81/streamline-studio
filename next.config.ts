import type { NextConfig } from 'next';

/**
 * Next.js Configuration
 *
 * ADR-001 Requirements:
 * - output: 'standalone' for optimized Docker images
 * - reactStrictMode for development best practices
 *
 * @see /docs/adrs/001-nextjs-framework.md
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Transpile specific packages if needed
  transpilePackages: [],

  // Image domains for next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // YouTube thumbnails in Phase 6
      },
    ],
  },

  // Security headers (ADR-014)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Strict-Transport-Security (HSTS)
          // Forces HTTPS for 1 year, including subdomains
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Content-Security-Policy
          // Restricts resource loading to prevent XSS attacks
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev, unsafe-inline for inline scripts
              "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for CSS-in-JS and Next.js
              "img-src 'self' data: https://i.ytimg.com", // Allow YouTube thumbnails
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
