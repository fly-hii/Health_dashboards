'use strict';

const { Op } = require('sequelize');

const getAuditLogs = async (req, res) => {
  try {
    const { user, action, module, startDate, endDate } = req.query;
    const { AuditLog, User } = req.models;
    
    const where = { hospital_id: req.hospitalId };

    if (user) where.user_id = user;
    if (action) where.action = action;
    if (module) where.module = module;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuditLogs
};
