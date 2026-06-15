import api from './api';

export const vitalsService = {
  recordVitals:           (data)       => api.post('/vitals', data),
  updateVitals:           (id, data)   => api.put(`/vitals/${id}`, data),
  getVitalsByAppointment: (apptId)     => api.get(`/vitals/appointment/${apptId}`),
  getVitalsByPatient:     (patientId)  => api.get(`/vitals/patient/${patientId}`),
};
