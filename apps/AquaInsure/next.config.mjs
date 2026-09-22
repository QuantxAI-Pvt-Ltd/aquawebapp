// Polyfill localStorage in Node.js during Next.js static build
if (typeof globalThis !== 'undefined') {
  try {
    const store = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
        key: (i) => Array.from(store.keys())[i] ?? null,
        get length() {
          return store.size;
        },
      },
      configurable: true,
      writable: true,
    });
  } catch { }
}

const rawDevOrigins = process.env.ALLOWED_DEV_ORIGINS || '';
const allowedDevOrigins = rawDevOrigins
  ? rawDevOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : ['10.47.51.139', '10.63.178.139', 'localhost'];

const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self)',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; img-src 'self' data: blob: http: https:; media-src 'self' data: blob: http: https:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' http: https: ws: wss:;",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isDev ? {} : { output: 'export' }),
  distDir: './dist',
  basePath: '/aquainsure',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  allowedDevOrigins,
  ...(isDev
    ? {
        async headers() {
          return [
            {
              source: '/:path*',
              headers: securityHeaders,
            },
          ];
        },
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: 'http://localhost:5001/api/:path*',
              basePath: false,
            },
            {
              source: '/aquainsure/api/:path*',
              destination: 'http://localhost:5001/api/:path*',
              basePath: false,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;