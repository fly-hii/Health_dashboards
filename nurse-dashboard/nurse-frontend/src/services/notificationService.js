import api from './api';

export const notificationService = {
  getNotifications:    (params) => api.get('/notifications', { params }),
  markAsRead:          (id)     => api.put(`/notifications/${id}/read`),
  markAllAsRead:       ()       => api.put('/notifications/read-all'),
  deleteNotification:  (id)     => api.delete(`/notifications/${id}`),
  clearAll:            ()       => api.delete('/notifications/clear-all'),
};
