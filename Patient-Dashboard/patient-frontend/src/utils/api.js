// API fetch requests for CarePlus Hospital Patient Portal

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed && parsed.message) {
        errorMessage = parsed.message;
      }
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

const getHeaders = () => {
  const token = localStorage.getItem('patient_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  login: (data) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  register: (data) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  sendOtp: (data) =>
    fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  changePassword: (data) =>
    fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Profile
  getProfile: () => fetch(`${BASE_URL}/profile`, { headers: getHeaders() }).then(handleResponse).then(res => res.user || res),
  updateProfile: (data) =>
    fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse).then(res => res.user || res),

  // Doctors
  getDoctors: () => fetch(`${BASE_URL}/doctors`, { headers: getHeaders() }).then(handleResponse),

  // Appointments
  getAppointments: () => fetch(`${BASE_URL}/appointments`, { headers: getHeaders() }).then(handleResponse),
  getPatientAppointments: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return fetch(`${BASE_URL}/patient/appointments${queryString ? `?${queryString}` : ''}`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },
  getAppointmentById: (id) =>
    fetch(`${BASE_URL}/patient/appointments/${id}`, { headers: getHeaders() }).then(handleResponse),
  bookAppointment: (data) =>
    fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  rescheduleAppointment: (id, data) =>
    fetch(`${BASE_URL}/appointments/${id}/reschedule`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  cancelAppointment: (id, data) =>
    fetch(`${BASE_URL}/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteAppointment: (id) =>
    fetch(`${BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  // Tokens
  getCurrentToken: () => fetch(`${BASE_URL}/token/current`, { headers: getHeaders() }).then(handleResponse),
  getPastTokens: () => fetch(`${BASE_URL}/token/past`, { headers: getHeaders() }).then(handleResponse),
  refreshCurrentToken: () =>
    fetch(`${BASE_URL}/token/refresh`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  getTokenById: (id) =>
    fetch(`${BASE_URL}/patient/tokens/${id}`, { headers: getHeaders() }).then(handleResponse),
  getTokenHistory: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const qs = params.toString();
    return fetch(`${BASE_URL}/patient/tokens/history${qs ? `?${qs}` : ''}`, { headers: getHeaders() }).then(handleResponse);
  },

  // Vitals
  getLatestVitals: () => fetch(`${BASE_URL}/vitals/latest`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res),

  // Medical History
  getHistory: () => fetch(`${BASE_URL}/history`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res),

  // Prescriptions
  getPrescriptions: () => fetch(`${BASE_URL}/prescriptions`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res),

  // Reports
  getReports: () => fetch(`${BASE_URL}/reports`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res),
  uploadReport: (data) =>
    fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res),

  // Patient-specific report endpoints
  getPatientReports: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const query = params.toString();
    return fetch(`${BASE_URL}/patient/reports${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res);
  },
  getReportById: (id) =>
    fetch(`${BASE_URL}/patient/reports/${id}`, { headers: getHeaders() }).then(handleResponse),
  uploadPatientReport: (formData) => {
    const token = localStorage.getItem('patient_token');
    return fetch(`${BASE_URL}/patient/reports/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res);
  },
  deletePatientReport: (id) =>
    fetch(`${BASE_URL}/patient/reports/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  getReportDownloadUrl: (id) => `${BASE_URL}/patient/reports/download/${id}`,


  // Notifications
  getNotifications: () => fetch(`${BASE_URL}/notifications`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res),
  readAllNotifications: () =>
    fetch(`${BASE_URL}/notifications/read-all`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  deleteNotification: (id) =>
    fetch(`${BASE_URL}/notifications/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // New patient specific notification APIs
  getPatientNotifications: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const query = params.toString();
    return fetch(`${BASE_URL}/patient/notifications${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse).then(res => res.hasOwnProperty('data') ? res.data : res);
  },
  getNotificationById: (id) =>
    fetch(`${BASE_URL}/patient/notifications/${id}`, { headers: getHeaders() }).then(handleResponse),
  markNotificationAsRead: (id) =>
    fetch(`${BASE_URL}/patient/notifications/${id}/read`, { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
  deletePatientNotification: (id) =>
    fetch(`${BASE_URL}/patient/notifications/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  getUnreadNotificationsCount: () =>
    fetch(`${BASE_URL}/patient/notifications/unread-count`, { headers: getHeaders() }).then(handleResponse),
};
