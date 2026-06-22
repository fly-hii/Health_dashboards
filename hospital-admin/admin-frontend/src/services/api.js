import axios from 'axios';

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
