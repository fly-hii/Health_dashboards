'use strict';

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { SuperAdmin, AuditLog } = require('../models');

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const admin = await SuperAdmin.findOne({ where: { email } });
    if (!admin)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!admin.is_active)
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await admin.update({ last_login: new Date() });

    AuditLog.create({
      admin_id: admin.id, hospital_id: null,
      action: 'LOGIN', module: 'Auth',
      description: `Super Admin "${admin.name}" logged in`,
      ip_address: req.ip,
    }).catch(console.error);

    const token = generateToken({ id: admin.id, role: 'SUPER_ADMIN', hospitalId: null });

    res.json({
      success: true, token,
      user: { id: admin.id, name: admin.name, email: admin.email, role: 'SUPER_ADMIN' },
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  if (req.user) {
    AuditLog.create({
      admin_id: req.user.id, action: 'LOGOUT', module: 'Auth',
      description: `Super Admin "${req.user.name}" logged out`, ip_address: req.ip,
    }).catch(console.error);
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { login, logout, getMe };
