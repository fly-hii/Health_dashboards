// API fetch requests for CarePlus Hospital Patient Portal

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
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  register: (data) =>
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  changePassword: (data) =>
    fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Profile
  getProfile: () => fetch('/api/profile', { headers: getHeaders() }).then(handleResponse),
  updateProfile: (data) =>
    fetch('/api/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Doctors
  getDoctors: () => fetch('/api/doctors', { headers: getHeaders() }).then(handleResponse),

  // Appointments
  getAppointments: () => fetch('/api/appointments', { headers: getHeaders() }).then(handleResponse),
  getPatientAppointments: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return fetch(`/api/patient/appointments${queryString ? `?${queryString}` : ''}`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },
  getAppointmentById: (id) =>
    fetch(`/api/patient/appointments/${id}`, { headers: getHeaders() }).then(handleResponse),
  bookAppointment: (data) =>
    fetch('/api/appointments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  rescheduleAppointment: (id, data) =>
    fetch(`/api/appointments/${id}/reschedule`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  cancelAppointment: (id, data) =>
    fetch(`/api/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteAppointment: (id) =>
    fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  // Tokens
  getCurrentToken: () => fetch('/api/token/current', { headers: getHeaders() }).then(handleResponse),
  getPastTokens: () => fetch('/api/token/past', { headers: getHeaders() }).then(handleResponse),
  refreshCurrentToken: () =>
    fetch('/api/token/refresh', { method: 'POST', headers: getHeaders() }).then(handleResponse),
  getTokenById: (id) =>
    fetch(`/api/patient/tokens/${id}`, { headers: getHeaders() }).then(handleResponse),
  getTokenHistory: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const qs = params.toString();
    return fetch(`/api/patient/tokens/history${qs ? `?${qs}` : ''}`, { headers: getHeaders() }).then(handleResponse);
  },

  // Vitals
  getLatestVitals: () => fetch('/api/vitals/latest', { headers: getHeaders() }).then(handleResponse),

  // Medical History
  getHistory: () => fetch('/api/history', { headers: getHeaders() }).then(handleResponse),

  // Prescriptions
  getPrescriptions: () => fetch('/api/prescriptions', { headers: getHeaders() }).then(handleResponse),

  // Reports
  getReports: () => fetch('/api/reports', { headers: getHeaders() }).then(handleResponse),
  uploadReport: (data) =>
    fetch('/api/reports', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Patient-specific report endpoints
  getPatientReports: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const query = params.toString();
    return fetch(`/api/patient/reports${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
  },
  getReportById: (id) =>
    fetch(`/api/patient/reports/${id}`, { headers: getHeaders() }).then(handleResponse),
  uploadPatientReport: (formData) => {
    const token = localStorage.getItem('patient_token');
    return fetch('/api/patient/reports/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(handleResponse);
  },
  deletePatientReport: (id) =>
    fetch(`/api/patient/reports/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  getReportDownloadUrl: (id) => `/api/patient/reports/download/${id}`,


  // Notifications
  getNotifications: () => fetch('/api/notifications', { headers: getHeaders() }).then(handleResponse),
  readAllNotifications: () =>
    fetch('/api/notifications/read-all', { method: 'POST', headers: getHeaders() }).then(handleResponse),
  deleteNotification: (id) =>
    fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),

  // New patient specific notification APIs
  getPatientNotifications: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const query = params.toString();
    return fetch(`/api/patient/notifications${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
  },
  getNotificationById: (id) =>
    fetch(`/api/patient/notifications/${id}`, { headers: getHeaders() }).then(handleResponse),
  markNotificationAsRead: (id) =>
    fetch(`/api/patient/notifications/${id}/read`, { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
  deletePatientNotification: (id) =>
    fetch(`/api/patient/notifications/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  getUnreadNotificationsCount: () =>
    fetch('/api/patient/notifications/unread-count', { headers: getHeaders() }).then(handleResponse),
};
