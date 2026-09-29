import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

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
      ];
    }
    return [];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
        basePath: false as const,
      },
      ...(basePath ? [
        {
          source: `${basePath}/api/:path*`,
          destination: 'http://localhost:5001/api/:path*',
          basePath: false as const,
        }
      ] : [])
    ];
  },
};

export default nextConfig;

