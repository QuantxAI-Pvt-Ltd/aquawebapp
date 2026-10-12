import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://backend:5001' : 'http://localhost:5001');

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  async redirects() {
    if (basePath) {
      return [
        {
          source: '/',
          destination: basePath,
          permanent: false,
          basePath: false as const,
        },
        {
          source: '/login',
          destination: `${basePath}/login`,
          permanent: false,
          basePath: false as const,
        },
      ];
    }
    return [];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendInternalUrl}/api/:path*`,
        basePath: false as const,
      },
      ...(basePath ? [
        {
          source: `${basePath}/api/:path*`,
          destination: `${backendInternalUrl}/api/:path*`,
          basePath: false as const,
        }
      ] : [])
    ];
  },
};

export default nextConfig;

