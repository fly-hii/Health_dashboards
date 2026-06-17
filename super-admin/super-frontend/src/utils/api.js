import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sa_token');
      localStorage.removeItem('sa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────
export const login = (data) => API.post('/auth/login', data);
export const changePassword = (data) => API.put('/auth/change-password', data);
export const updateProfile = (data) => API.put('/auth/profile', data);

// ── Hospitals ───────────────────────────────────────────────
export const getHospitals = (params) => API.get('/super/hospitals', { params });
export const getHospital = (id) => API.get(`/super/hospitals/${id}`);
export const createHospital = (data) => API.post('/super/hospitals', data);
export const updateHospital = (id, data) => API.put(`/super/hospitals/${id}`, data);
export const suspendHospital = (id) => API.patch(`/super/hospitals/${id}/suspend`);
export const activateHospital = (id) => API.patch(`/super/hospitals/${id}/activate`);
export const updateHospitalPlan = (id, data) => API.put(`/super/hospitals/${id}/plan`, data);
export const deleteHospital = (id) => API.delete(`/super/hospitals/${id}`);
export const testDbConnection = (id, data) => API.post(`/super/hospitals/${id}/test-db`, data);

// ── Analytics ───────────────────────────────────────────────
export const getAnalytics = () => API.get('/super/analytics');

// ── Audit Logs ──────────────────────────────────────────────
export const getAuditLogs = (params) => API.get('/super/audit-logs', { params });

export default API;
