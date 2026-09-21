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
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: 'http://localhost:5001/api/:path*',
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;