import api from './api';

export const nurseService = {
  getDashboard:            ()         => api.get('/nurse/dashboard'),
  getPatientQueue:         (params)   => api.get('/nurse/patient-queue', { params }),
  getEmergencyQueue:       ()         => api.get('/nurse/emergency-queue'),
  getAppointmentDetails:   (id)       => api.get(`/nurse/appointment/${id}`),
  updateAppointmentStatus: (id, status) => api.put(`/nurse/appointment/${id}/status`, { status }),
  getPatientProfile:       (id)       => api.get(`/nurse/patient/${id}`),
  addWalkInPatient:        (data)     => api.post('/nurse/walk-in', data),
  searchPatients:          (q)        => api.get('/nurse/patients/search', { params: { q } }),
  updatePatient:           (id, data) => api.put(`/nurse/patient/${id}`, data),
  callPatient:             (id)       => api.post(`/nurse/appointment/${id}/call`),
};
