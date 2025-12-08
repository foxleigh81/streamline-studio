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
        ],
      },
    ];
  },
};

export default nextConfig;
