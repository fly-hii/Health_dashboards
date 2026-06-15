const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const generateToken = (user) => jwt.sign(
  { id: user.id, hospitalId: user.hospital_id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!['NURSE', 'HOSPITAL_ADMIN'].includes(user.role)) return res.status(403).json({ success: false, message: 'Not authorized for this portal' });
    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account deactivated' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await user.update({ last_login: new Date() });
    const token = generateToken(user);
    const { password: _, ...userData } = user.toJSON();
    res.json({ success: true, token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const { password: _, ...userData } = req.user.toJSON();
    res.json({ success: true, data: { user: userData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { password, role, hospital_id, ...updates } = req.body;
    await req.user.update(updates);
    const { password: _, ...userData } = req.user.toJSON();
    res.json({ success: true, user: userData, data: { user: userData }, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { User } = req.models;
    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    await user.update({ password: await bcrypt.hash(newPassword, salt) });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, getProfile, updateProfile, changePassword };
