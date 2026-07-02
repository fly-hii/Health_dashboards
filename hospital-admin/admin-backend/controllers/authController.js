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
const { decrypt } = require('../services/encryptionService');
const { loginOtpStore } = require('./forgotPasswordController');
const { getSignedDownloadUrl } = require('../services/s3Service');

const signAvatarUrl = async (avatarUrl) => {
  if (!avatarUrl) return avatarUrl;
  if (avatarUrl.includes('s3.ap-south-1.amazonaws.com') || avatarUrl.includes('.s3.amazonaws.com')) {
    const match = avatarUrl.match(/amazonaws\.com\/(.+)$/);
    if (match && match[1]) {
      try {
        const signedUrl = await getSignedDownloadUrl(match[1]);
        return signedUrl;
      } catch (err) {
        console.warn('⚠️ Warning: Failed to sign S3 URL:', err.message);
      }
    }
  }
  return avatarUrl;
};

const isValidLoginOtp = (email, otp) => {
  const record = loginOtpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) { loginOtpStore.delete(email.toLowerCase()); return false; }
  if (record.otp !== otp.toString()) return false;
  loginOtpStore.delete(email.toLowerCase()); // single-use
  return true;
};

const isOtpValid = (email, otp) => {
  if (!otp) return false;
  const record = loginOtpStore.get(email.toLowerCase());
  return record && record.otp === otp.toString() && Date.now() <= record.expiresAt;
};

const checkUserInOtherPortals = async (email, password, otp) => {
  try {
    const [superAdmins] = await masterDb.query("SELECT password FROM super_admin_users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (superAdmins && superAdmins.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, superAdmins[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  const { sharedSaasDb } = require('../services/databaseResolver');
  try {
    const [users] = await sharedSaasDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (users && users.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  try {
    const [patients] = await sharedSaasDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { replacements: [email] });
    if (patients && patients.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  try {
    const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
    const { getHospitalConnection } = require('../services/databaseResolver');
    const { Sequelize } = require('sequelize');
    for (const conn of connections) {
      try {
        const decryptedPassword = decrypt(conn.password_encrypted);
        const externalDb = new Sequelize(conn.database_name, conn.username, decryptedPassword, {
          host: conn.host, port: conn.port || 3306, dialect: 'mysql', dialectModule: require('mysql2'), logging: false,
          dialectOptions: conn.ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {},
        });
        const [users] = await externalDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
        if (users && users.length > 0) {
          const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
          await externalDb.close();
          if (ok) return true;
        }
        const [patients] = await externalDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { replacements: [email] });
        if (patients && patients.length > 0) {
          const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
          await externalDb.close();
          if (ok) return true;
        }
        await externalDb.close();
      } catch (_) {}
    }
  } catch (_) {}

  return false;
};

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

    // Step 3: Find user in tenant DB.
    // In the shared SaaS DB the same email can exist under multiple hospitals,
    // so scope the lookup to the resolved hospital when a code was supplied.
    // Without a code, reject ambiguous emails that span multiple tenants.
    const { User, AuditLog } = models;
    let user;
    if (hospitalId) {
      user = await User.findOne({ where: { email, hospital_id: hospitalId } });
    } else {
      const matches = await User.findAll({ where: { email } });
      if (matches.length > 1) {
        return res.status(409).json({
          success: false,
          message: 'This email is registered with multiple hospitals. Please provide your hospital code to sign in.',
        });
      }
      user = matches[0] || null;
    }

    if (!user) {
      const existsElsewhere = await checkUserInOtherPortals(email, password, otp);
      if (existsElsewhere) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Restrict access to administrative roles
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HOSPITAL_ADMIN' && user.role !== 'ADMIN') {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, user.password);
      if (ok) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    if (user.status === 'Inactive')
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact your hospital admin.' });

    hospitalId = hospitalId || user.hospital_id;

    if (otp) {
      if (!isValidLoginOtp(email, otp)) {
        return res.status(401).json({ success: false, message: 'Invalid or expired OTP code' });
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

    const signedProfileImage = await signAvatarUrl(user.profile_image);
    res.json({
      success: true, token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, department: user.department,
        hospitalId,
        profile_image: signedProfileImage,
        profileImage: signedProfileImage,
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
