'use strict';
const jwt        = require('jsonwebtoken');
const { SuperAdmin } = require('../models');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const token   = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await SuperAdmin.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!admin)       return res.status(401).json({ success: false, message: 'Super admin not found' });
    if (!admin.is_active) return res.status(403).json({ success: false, message: 'Account deactivated' });

    req.user = { ...admin.toJSON(), role: 'SUPER_ADMIN' };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN')
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  next();
};

module.exports = { protect, isSuperAdmin };
