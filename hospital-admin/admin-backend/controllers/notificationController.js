'use strict';

const { Op } = require('sequelize');
const { emitToHospital } = require('../sockets/socket');

// ── Helpers ────────────────────────────────────────────────────────────────────

const getTodayRange = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildFilter = (query, hospitalId) => {
  const filter = { hospital_id: hospitalId };
  if (query.search) {
    filter[Op.or] = [
      { title: { [Op.like]: `%${query.search}%` } },
      { message: { [Op.like]: `%${query.search}%` } }
    ];
  }
  if (query.type && query.type !== 'all') filter.type = query.type;
  if (query.priority && query.priority !== 'all') filter.priority = query.priority;
  if (query.module && query.module !== 'all') filter.module = query.module;
  if (query.status === 'unread') filter.status = 'unread';
  if (query.status === 'read') filter.status = { [Op.in]: ['read', 'resolved'] };
  if (query.dateFrom || query.dateTo) {
    filter.created_at = {};
    if (query.dateFrom) filter.created_at[Op.gte] = new Date(query.dateFrom);
    if (query.dateTo) {
      const to = new Date(query.dateTo); to.setHours(23, 59, 59, 999);
      filter.created_at[Op.lte] = to;
    }
  }
  return filter;
};

// ── GET /api/notifications ─────────────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const { Notification } = req.models;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 8);
    const offset = (page - 1) * limit;

    const filter = buildFilter(req.query, req.hospitalId);

    const { rows: notifications, count: total } = await Notification.findAndCountAll({
      where: filter,
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });

    res.json({
      success: true,
      data: notifications.map(n => {
        const item = n.toJSON();
        return {
          ...item,
          _id: item.id,
          isRead: item.status !== 'unread',
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/notifications/stats ───────────────────────────────────────────────
const getNotificationStats = async (req, res) => {
  try {
    const { Notification } = req.models;
    const { start, end } = getTodayRange();
    const [total, unread, important, today, resolved] = await Promise.all([
      Notification.count({ where: { hospital_id: req.hospitalId } }),
      Notification.count({ where: { hospital_id: req.hospitalId, status: 'unread' } }),
      Notification.count({ where: { hospital_id: req.hospitalId, is_important: true } }),
      Notification.count({ where: { hospital_id: req.hospitalId, created_at: { [Op.between]: [start, end] } } }),
      Notification.count({ where: { hospital_id: req.hospitalId, status: 'resolved' } })
    ]);
    res.json({ success: true, data: { total, unread, important, today, resolved } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/notifications/:id ─────────────────────────────────────────────────
const getNotificationById = async (req, res) => {
  try {
    const { Notification } = req.models;
    const notification = await Notification.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    
    const item = notification.toJSON();
    res.json({
      success: true,
      data: {
        ...item,
        _id: item.id,
        isRead: item.status !== 'unread',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { Notification } = req.models;
    const notification = await Notification.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!notification) return res.status(404).json({ success: false, message: 'Not found' });

    await notification.update({ status: 'read', read_at: new Date() });

    const item = notification.toJSON();
    const formatted = {
      ...item,
      _id: item.id,
      isRead: true,
    };
    emitToHospital(req.hospitalId, 'NOTIFICATION_UPDATED', formatted);
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/notifications/:id/important ────────────────────────────────────
const markAsImportant = async (req, res) => {
  try {
    const { Notification } = req.models;
    const notif = await Notification.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });

    await notif.update({ is_important: !notif.is_important });

    const item = notif.toJSON();
    const formatted = {
      ...item,
      _id: item.id,
      isRead: item.status !== 'unread',
    };
    emitToHospital(req.hospitalId, 'NOTIFICATION_UPDATED', formatted);
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/notifications/read-all ─────────────────────────────────────────
const markAllAsRead = async (req, res) => {
  try {
    const { Notification } = req.models;
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { hospital_id: req.hospitalId, status: 'unread' } }
    );
    emitToHospital(req.hospitalId, 'ALL_NOTIFICATIONS_READ', {});
    res.json({ success: true, message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
const deleteNotification = async (req, res) => {
  try {
    const { Notification } = req.models;
    const notif = await Notification.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });

    await notif.destroy();
    emitToHospital(req.hospitalId, 'NOTIFICATION_DELETED', { _id: req.params.id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Helper: Create & broadcast a notification (used by other controllers) ──────
const createNotification = async ({ hospitalId, userId, title, message, type = 'system', priority = 'medium', relatedEntityId, metadata = {} }) => {
  const { getHospitalConnection } = require('../services/databaseResolver');
  const { createModels } = require('../services/modelFactory');
  const db = await getHospitalConnection(hospitalId);
  const models = createModels(db);
  const { Notification } = models;

  const notif = await Notification.create({
    hospital_id: hospitalId,
    user_id: userId || null,
    title,
    message,
    type,
    priority,
    related_entity_id: relatedEntityId,
    metadata,
  });

  const item = notif.toJSON();
  const formatted = {
    ...item,
    _id: item.id,
    isRead: false,
  };
  emitToHospital(hospitalId, 'NEW_NOTIFICATION', formatted);
  return formatted;
};

module.exports = {
  getNotifications,
  getNotificationStats,
  getNotificationById,
  markAsRead,
  markAsImportant,
  markAllAsRead,
  deleteNotification,
  createNotification
};
