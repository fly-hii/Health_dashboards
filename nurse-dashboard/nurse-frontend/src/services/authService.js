import api from './api';

export const authService = {
  login:          (data)    => api.post('/auth/login', data),
  getProfile:     ()        => api.get('/auth/profile'),
  updateProfile:  (data)    => api.put('/auth/profile', data),
  changePassword: (data)    => api.put('/auth/change-password', data),
};
