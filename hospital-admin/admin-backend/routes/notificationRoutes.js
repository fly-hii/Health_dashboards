const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotificationStats,
  getNotificationById,
  markAsRead,
  markAsImportant,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Stats
router.get('/stats', getNotificationStats);

// Mark all as read
router.patch('/read-all', markAllAsRead);

// List + single
router.get('/', getNotifications);
router.get('/:id', getNotificationById);

// Actions
router.patch('/:id/read', markAsRead);
router.patch('/:id/important', markAsImportant);

// Legacy PUT for backward compat (header dropdown)
router.put('/:id', markAsRead);

// Delete
router.delete('/:id', deleteNotification);

module.exports = router;
