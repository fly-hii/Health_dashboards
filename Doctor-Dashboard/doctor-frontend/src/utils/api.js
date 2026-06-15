// API fetch helper requests for CarePlus Doctor Dashboard

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

  getProfile: () => fetch('/api/doctors/profile', { headers: getHeaders() }).then(handleResponse),
  
  updateProfile: (data) =>
    fetch('/api/doctors/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  changePassword: (data) =>
    fetch('/api/doctors/change-password', {
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
    return fetch('/api/doctors/upload-avatar', {
      method: 'POST',
      headers,
      body: formData,
    }).then(handleResponse);
  },

  // Doctor operations
  getStats: () => fetch('/api/doctor/stats', { headers: getHeaders() }).then(handleResponse),
  
  getQueue: () => fetch('/api/doctor/queue', { headers: getHeaders() }).then(handleResponse),
  
  getAppointmentDetails: (id) => fetch(`/api/doctor/appointment/${id}`, { headers: getHeaders() }).then(handleResponse),
  
  callPatient: (id) =>
    fetch(`/api/doctor/appointment/${id}/call`, {
      method: 'PUT',
      headers: getHeaders(),
    }).then(handleResponse),

  submitConsultation: (id, data) =>
    fetch(`/api/doctor/diagnose/${id}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getPatientHistory: (patientId) =>
    fetch(`/api/doctor/patient/${patientId}/history`, { headers: getHeaders() }).then(handleResponse),

  getPatients: () =>
    fetch('/api/doctor/patients', { headers: getHeaders() }).then(handleResponse),

  getNotifications: () =>
    fetch('/api/doctor/notifications', { headers: getHeaders() }).then(handleResponse),

  markNotificationRead: (id) =>
    fetch(`/api/doctor/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    }).then(handleResponse),

  bookAppointment: (data) =>
    fetch('/api/doctor/appointments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getPrescriptions: () =>
    fetch('/api/doctor/prescriptions', { headers: getHeaders() }).then(handleResponse),

  getReports: () =>
    fetch('/api/doctor/reports', { headers: getHeaders() }).then(handleResponse),

  uploadReport: (data) =>
    fetch('/api/doctor/reports', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Medical Records
  getMedicalRecords: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`/api/medical-records?${query}`, { headers: getHeaders() }).then(handleResponse);
  },
  getMedicalRecordById: (id) =>
    fetch(`/api/medical-records/${id}`, { headers: getHeaders() }).then(handleResponse),
  getPatientMedicalRecords: (patientId) =>
    fetch(`/api/medical-records/patient/${patientId}`, { headers: getHeaders() }).then(handleResponse),
  updatePrescription: (id, data) =>
    fetch(`/api/doctor/prescriptions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Reports V3
  getReportsV3: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`/api/reports?${query}`, { headers: getHeaders() }).then(handleResponse);
  },
  getReportDetailsV3: (id) =>
    fetch(`/api/reports/${id}`, { headers: getHeaders() }).then(handleResponse),
  uploadReportV3: (formData) => {
    const token = localStorage.getItem('doctor_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch('/api/reports/upload', {
      method: 'POST',
      headers,
      body: formData
    }).then(handleResponse);
  },
  deleteReportV3: (id) =>
    fetch(`/api/reports/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  getReportDownloadUrl: (id) => `/api/reports/download/${id}`,
};


