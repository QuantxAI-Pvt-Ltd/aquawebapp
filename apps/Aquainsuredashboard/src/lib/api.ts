export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    // In client browser, use relative path so requests route through proxy/origin
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost:5001')) {
      return envUrl;
    }
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
})();

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const session = JSON.parse(localStorage.getItem('admin-session') || '{}');
    return session?.token || null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Auto-logout on 401 (expired/invalid admin token)
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('admin-session');
    window.location.href = `${BASE_PATH}/login`;
    return Promise.reject(new Error('Admin session expired. Redirecting to login.'));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  return res.json();
}

// Convenience wrappers
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

