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

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const addUnderscoreId = (obj) => {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach(addUnderscoreId);
    } else {
      if ('id' in obj && !('_id' in obj)) {
        obj._id = obj.id;
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          addUnderscoreId(obj[key]);
        }
      }
    }
  }
};

// Response Interceptor: Handle response mapping and errors
API.interceptors.response.use(
  (response) => {
    if (response.data) {
      addUnderscoreId(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid, clear localStorage and redirect to login
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
