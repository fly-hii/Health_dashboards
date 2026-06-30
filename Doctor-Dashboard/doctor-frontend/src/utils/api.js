// API fetch helper requests for CarePlus Doctor Dashboard

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

/**
 * Sanitize image/avatar URLs from the database.
 * Rejects localhost URLs (returns null → caller uses placeholder),
 * upgrades http:// → https://, resolves relative /uploads/ paths.
 */
export const getImageUrl = (url) => {
  if (!url) return null;
  if (/localhost|127\.0\.0\.1/.test(url) && !/localhost|127\.0\.0\.1/.test(window.location.hostname)) return null;
  if (url.startsWith('/')) {
    const origin = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '')
      .replace(/\/api$/, '');
    return origin ? `${origin}${url}` : url;
  }
  if (url.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(url)) return url.replace(/^http:\/\//, 'https://');
  return url;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('doctor_token');
    window.location.reload();
  }
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
  const token = localStorage.getItem('doctor_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth & Profile
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

  getProfile: () => fetch(`${BASE_URL}/doctors/profile`, { headers: getHeaders() }).then(handleResponse),
  
  updateProfile: (data) =>
    fetch(`${BASE_URL}/doctors/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  changePassword: (data) =>
    fetch(`${BASE_URL}/doctors/change-password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  uploadDoctorAvatar: (formData) => {
    const token = localStorage.getItem('doctor_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}/doctors/upload-avatar`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(handleResponse);
  },

  // Doctor operations
  getStats: () => fetch(`${BASE_URL}/doctor/stats`, { headers: getHeaders() }).then(handleResponse),
  
  getQueue: () => fetch(`${BASE_URL}/doctor/queue`, { headers: getHeaders() }).then(handleResponse),
  
  getAppointmentDetails: (id) => fetch(`${BASE_URL}/doctor/appointment/${id}`, { headers: getHeaders() }).then(handleResponse),
  
  callPatient: (id) =>
    fetch(`${BASE_URL}/doctor/appointment/${id}/call`, {
      method: 'PUT',
      headers: getHeaders(),
    }).then(handleResponse),

  submitConsultation: (id, data) =>
    fetch(`${BASE_URL}/doctor/diagnose/${id}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getPatientHistory: (patientId) =>
    fetch(`${BASE_URL}/doctor/patient/${patientId}/history`, { headers: getHeaders() }).then(handleResponse),

  getPatients: () =>
    fetch(`${BASE_URL}/doctor/patients`, { headers: getHeaders() }).then(handleResponse),

  getNotifications: () =>
    fetch(`${BASE_URL}/doctor/notifications`, { headers: getHeaders() }).then(handleResponse),

  markNotificationRead: (id) =>
    fetch(`${BASE_URL}/doctor/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    }).then(handleResponse),

  bookAppointment: (data) =>
    fetch(`${BASE_URL}/doctor/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getPrescriptions: () =>
    fetch(`${BASE_URL}/doctor/prescriptions`, { headers: getHeaders() }).then(handleResponse),

  getReports: () =>
    fetch(`${BASE_URL}/doctor/reports`, { headers: getHeaders() }).then(handleResponse),

  uploadReport: (data) =>
    fetch(`${BASE_URL}/doctor/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Medical Records
  getMedicalRecords: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/medical-records?${query}`, { headers: getHeaders() }).then(handleResponse);
  },
  getMedicalRecordById: (id) =>
    fetch(`${BASE_URL}/medical-records/${id}`, { headers: getHeaders() }).then(handleResponse),
  getPatientMedicalRecords: (patientId) =>
    fetch(`${BASE_URL}/medical-records/patient/${patientId}`, { headers: getHeaders() }).then(handleResponse),
  updatePrescription: (id, data) =>
    fetch(`${BASE_URL}/doctor/prescriptions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Reports V3
  getReportsV3: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/reports?${query}`, { headers: getHeaders() }).then(handleResponse);
  },
  getReportDetailsV3: (id) =>
    fetch(`${BASE_URL}/reports/${id}`, { headers: getHeaders() }).then(handleResponse),
  uploadReportV3: (formData) => {
    const token = localStorage.getItem('doctor_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}/reports/upload`, {
      method: 'POST',
      headers,
      body: formData
    }).then(handleResponse);
  },
  deleteReportV3: (id) =>
    fetch(`${BASE_URL}/reports/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  getReportDownloadUrl: (id) => `${BASE_URL}/reports/download/${id}`,
};


