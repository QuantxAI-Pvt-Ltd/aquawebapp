import axios from 'axios';

const getApiBaseUrl = (): string => {
  let envUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (envUrl) {
    // Strip trailing slash and any redundant trailing '/api' since frontend paths include '/api'
    envUrl = envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    // If accessed through Apache reverse proxy (standard port 80/443), relative '' uses Apache proxy
    if (!window.location.port || window.location.port === '80' || window.location.port === '443') {
      return '';
    }
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }
  return 'http://localhost:5001';
};

export const API_BASE_URL = getApiBaseUrl();

// Configure global Axios base URL
axios.defaults.baseURL = API_BASE_URL;

// Attach active JWT token from session to all outgoing requests
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
      if (session?.token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    } catch { }
  }
  return config;
});

// Response interceptor: automatically detect 401/403 session expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      const currentPath = window.location.pathname;
      // If not already on login or landing page, purge stale auth and redirect
      if (!currentPath.includes('/login') && !currentPath.includes('/signup') && !currentPath.endsWith('/language/')) {
        console.warn('[Auth Interceptor] Session token expired or invalid. Redirecting to login.');
        localStorage.removeItem('aqua-session');
        localStorage.removeItem('shrimpguard-user');
        window.location.href = '/aquainsure/login/';
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
