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
  } catch {}
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: './dist',
  basePath: '/aquainsure',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;