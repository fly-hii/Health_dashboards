import axios from 'axios';

/**
 * Sanitize image/avatar URLs from the database.
 * Rejects localhost URLs → returns null so caller falls back to placeholder.
 * Upgrades http:// → https://, resolves relative /uploads/ paths.
 */
export const getImageUrl = (url) => {
  if (!url) return null;
  if (/localhost|127\.0\.0\.1/.test(url)) return null;
  if (url.startsWith('/')) {
    const origin = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
    return origin ? `${origin}${url}` : url;
  }
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://');
  return url;
};

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api$/, '');
  }
  return '';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
