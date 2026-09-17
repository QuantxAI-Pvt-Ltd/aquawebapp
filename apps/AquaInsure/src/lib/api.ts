import axios from 'axios';

// Configure global Axios base URL from environment
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (apiUrl) {
  // Strip any trailing slash for consistency
  axios.defaults.baseURL = apiUrl.replace(/\/+$/, '');
}

// Attach active JWT token from session to all outgoing requests
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
      if (session.token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    } catch { }
  }
  return config;
});

export const API_BASE_URL = apiUrl || '';
export default axios;
