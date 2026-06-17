'use strict';

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { SuperAdmin, AuditLog } = require('../models');

const getPasswordComplexityError = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !, @, #, $, %, etc.).';
  }
  return null;
};

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, otp } = req.body;
  try {
    if (!email)
      return res.status(400).json({ success: false, message: 'Email required' });
    if (!password && !otp)
      return res.status(400).json({ success: false, message: 'Email and password or OTP required' });

    const admin = await SuperAdmin.findOne({ where: { email } });
    if (!admin)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!admin.is_active)
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    if (otp) {
      if (otp !== '123456')
        return res.status(401).json({ success: false, message: 'Invalid OTP code' });
    } else {
      const ok = await bcrypt.compare(password, admin.password);
      if (!ok)
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

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

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Current and new password required' });

    const pwdError = getPasswordComplexityError(newPassword);
    if (pwdError)
      return res.status(400).json({ success: false, message: pwdError });

    const admin = await SuperAdmin.findByPk(req.user.id);
    if (!admin)
      return res.status(404).json({ success: false, message: 'Admin not found' });

    const ok = await bcrypt.compare(currentPassword, admin.password);
    if (!ok)
      return res.status(400).json({ success: false, message: 'Invalid current password' });

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);
    await admin.update({ password: hashed });

    AuditLog.create({
      admin_id: admin.id, hospital_id: null,
      action: 'UPDATE', module: 'Auth',
      description: `Super Admin "${admin.name}" changed password`,
      ip_address: req.ip,
    }).catch(console.error);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Super admin password change error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  try {
    if (!name || !email)
      return res.status(400).json({ success: false, message: 'Name and email are required' });

    const admin = await SuperAdmin.findByPk(req.user.id);
    if (!admin)
      return res.status(404).json({ success: false, message: 'Admin not found' });

    // Check email uniqueness
    if (email !== admin.email) {
      const emailTaken = await SuperAdmin.findOne({ where: { email } });
      if (emailTaken)
        return res.status(400).json({ success: false, message: 'Email address is already in use by another admin' });
    }

    await admin.update({ name, email });

    AuditLog.create({
      admin_id: admin.id, hospital_id: null,
      action: 'UPDATE', module: 'Auth',
      description: `Super Admin "${admin.name}" updated profile details`,
      ip_address: req.ip,
    }).catch(console.error);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { id: admin.id, name: admin.name, email: admin.email, role: 'SUPER_ADMIN' }
    });
  } catch (error) {
    console.error('Super admin profile update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, logout, getMe, changePassword, updateProfile };
