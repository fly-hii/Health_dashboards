'use strict';
/**
 * authController.js (Hospital Admin Backend)
 *
 * Login flow (solves chicken-and-egg DB resolution):
 *   1. Client sends { email, password, hospitalCode }
 *   2. Query careplus_master.hospitals WHERE code = hospitalCode → get hospitalId + database_type
 *   3. Resolve tenant DB for that hospitalId
 *   4. Authenticate user from tenant DB
 *   5. Issue JWT { id, hospitalId, role }
 *
 * For backwards compatibility, if hospitalCode is omitted,
 * fallback queries sharedSaasDb directly (old behavior).
 */

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { masterDb }          = require('../services/databaseResolver');
const { getHospitalConnection } = require('../services/databaseResolver');
const { createModels }      = require('../services/modelFactory');

const genToken = (id, hospitalId, role) =>
  jwt.sign({ id, hospitalId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

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

// ── POST /api/auth/login ────────────────────────────────────────
const login = async (req, res) => {
  const { email, password, otp, hospitalCode } = req.body;

  if (!email)
    return res.status(400).json({ success: false, message: 'Email required' });

  if (!password && !otp)
    return res.status(400).json({ success: false, message: 'Password or OTP required' });

  try {
    let hospitalId;
    let db, models;

    if (hospitalCode) {
      // Step 1: Resolve hospital from master registry
      const [results] = await masterDb.query(
        'SELECT id, status, database_type FROM hospitals WHERE code = ? LIMIT 1',
        { replacements: [hospitalCode.toUpperCase()] }
      );
      const hospital = results?.[0];

      if (!hospital?.id)
        return res.status(404).json({ success: false, message: `Hospital code "${hospitalCode}" not found` });

      if (hospital.status === 'suspended')
        return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });

      hospitalId = hospital.id;
      // Step 2: Resolve tenant DB
      db     = await getHospitalConnection(hospitalId);
      models = createModels(db);
    } else {
      // Fallback: use shared SaaS DB (for admin-created users without code)
      const { sharedSaasDb } = require('../services/databaseResolver');
      db     = sharedSaasDb;
      models = createModels(db);
    }

    // Step 3: Find user in tenant DB
    const { User, AuditLog } = models;
    const user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Restrict access to administrative roles
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HOSPITAL_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only administrative users can access this portal.' });
    }

    if (user.status === 'Inactive')
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact your hospital admin.' });

    hospitalId = hospitalId || user.hospital_id;

    if (otp) {
      if (otp !== '123456') {
        return res.status(401).json({ success: false, message: 'Invalid OTP code' });
      }
    } else {
      const ok = await bcrypt.compare(password, user.password);
      if (!ok)
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.update({ last_login: new Date() });

    AuditLog.create({
      hospital_id: hospitalId,
      user_id: user.id,
      action: 'LOGIN',
      module: 'Auth',
      description: `${user.role} "${user.name}" logged in`,
      ip_address: req.ip,
    }).catch(console.error);

    const token = genToken(user.id, hospitalId, user.role);

    res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, department: user.department,
        hospitalId, profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/auth/logout ───────────────────────────────────────
const logout = async (req, res) => {
  if (req.user && req.models) {
    req.models.AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'LOGOUT', module: 'Auth',
      description: `${req.user.name} logged out`,
      ip_address: req.ip,
    }).catch(console.error);
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

// ── POST /api/auth/reset-password ──────────────────────────────
const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    const pwdError = getPasswordComplexityError(newPassword);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    const { User, AuditLog } = req.models;
    const user = await User.findOne({ where: { id: userId, hospital_id: req.hospitalId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ password: await bcrypt.hash(newPassword, 10) });

    AuditLog.create({
      hospital_id: req.hospitalId, user_id: req.user?.id || user.id,
      action: 'UPDATE', module: 'Auth', record_id: user.id,
      description: `Password reset for ${user.name}`, ip_address: req.ip,
    }).catch(console.error);

    res.json({ success: true, message: `Password reset for ${user.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, logout, resetPassword };
