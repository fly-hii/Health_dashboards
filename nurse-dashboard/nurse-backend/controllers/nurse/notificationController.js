const { Op } = require('sequelize');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { Notification } = req.models;
    const { type, unreadOnly, page = 1, limit = 20 } = req.query;

    const where = {
      hospital_id: req.hospitalId,
      [Op.or]: [{ user_id: req.user.id }, { user_id: null }],
    };

    if (type && type !== 'all') where.type = type;
    if (unreadOnly === 'true') where.status = 'unread';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    const unreadCount = await Notification.count({
      where: {
        hospital_id: req.hospitalId,
        user_id: req.user.id,
        status: 'unread',
      },
    });

    // Map `id` to `_id` and fields for frontend compatibility
    const mapped = rows.map(n => {
      const json = n.toJSON();
      json._id = json.id;
      json.isRead = json.status === 'read';
      return json;
    });

    res.json({
      success: true,
      data: mapped,
      unreadCount,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const { Notification } = req.models;
    const notification = await Notification.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId, user_id: req.user.id }
    });
    if (notification) {
      await notification.update({ status: 'read', read_at: new Date() });
    }
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const { Notification } = req.models;
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { user_id: req.user.id, hospital_id: req.hospitalId, status: 'unread' } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const { Notification } = req.models;
    await Notification.destroy({
      where: { id: req.params.id, hospital_id: req.hospitalId, user_id: req.user.id }
    });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
const clearAllNotifications = async (req, res, next) => {
  try {
    const { Notification } = req.models;
    await Notification.destroy({
      where: { user_id: req.user.id, hospital_id: req.hospitalId }
    });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications };
