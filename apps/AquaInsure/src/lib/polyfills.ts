// SSR polyfill for localStorage and browser APIs during Next.js static prerendering
if (typeof globalThis !== 'undefined') {
  let isMockNeeded = false;
  try {
    if (
      typeof window === 'undefined' ||
      typeof globalThis.localStorage === 'undefined' ||
      !globalThis.localStorage ||
      typeof globalThis.localStorage.getItem !== 'function'
    ) {
      isMockNeeded = true;
    }
  } catch {
    isMockNeeded = true;
  }

  if (isMockNeeded) {
    try {
      const store = new Map<string, string>();
      const mockStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, val: string) => store.set(key, String(val)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() {
          return store.size;
        },
      };

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true,
      });
    } catch {
      // Ignore polyfill errors
    }
  }
}

export {};
