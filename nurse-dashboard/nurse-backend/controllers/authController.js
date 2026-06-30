const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { masterDb } = require('../services/databaseResolver');
const { loginOtpStore } = require('./forgotPasswordController');
const fs = require('fs');
const path = require('path');

const isValidLoginOtp = (email, otp) => {
  const record = loginOtpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) { loginOtpStore.delete(email.toLowerCase()); return false; }
  if (record.otp !== otp.toString()) return false;
  loginOtpStore.delete(email.toLowerCase());
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
    const { decrypt } = require('../services/encryptionService');
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

const generateToken = (user) => jwt.sign(
  { id: user.id, hospitalId: user.hospital_id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, otp } = req.body;
  const hospitalCode = req.body.hospitalCode || req.headers['x-hospital-code'] || process.env.HOSPITAL_CODE;

  try {
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    if (!password && !otp) return res.status(400).json({ success: false, message: 'Email and password or OTP required' });

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let resolvedHospitalId;
    let db, models;
    let user;

    if (hospitalCode) {
      // Step 1: Resolve hospital from master DB
      const [hospRows] = await masterDb.query(
        'SELECT id, status, database_type FROM hospitals WHERE code = ? LIMIT 1',
        { replacements: [hospitalCode.toUpperCase()] }
      );
      const hospital = hospRows?.[0];
      if (!hospital?.id) {
        return res.status(404).json({ success: false, message: `Hospital code "${hospitalCode}" not found` });
      }
      if (hospital.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
      }
      resolvedHospitalId = hospital.id;

      // Step 2: Resolve tenant DB. Scope the lookup to this hospital — in the
      // shared SaaS DB an unscoped email match could belong to another tenant.
      db = await getHospitalConnection(resolvedHospitalId);
      models = createModels(db);
      user = await models.User.findOne({ where: { email, hospital_id: resolvedHospitalId } });
    } else {
      // Fallback: look up in shared database. Because the shared SaaS DB holds
      // users from every hospital, the same email can exist under multiple
      // tenants — resolving an arbitrary one would cross tenant boundaries.
      // Require an explicit hospital code to disambiguate in that case.
      const matches = await User.findAll({ where: { email } });
      if (matches.length > 1) {
        return res.status(409).json({
          success: false,
          message: 'This email is registered with multiple hospitals. Please provide your hospital code to sign in.',
        });
      }
      user = matches[0] || null;
      if (user) {
        resolvedHospitalId = user.hospital_id;
        // Verify hospital status in master registry
        const [hospRows] = await masterDb.query(
          'SELECT status FROM hospitals WHERE id = ? LIMIT 1',
          { replacements: [resolvedHospitalId] }
        );
        const hospital = hospRows?.[0];
        if (hospital?.status === 'suspended') {
          return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
        }
        db = await getHospitalConnection(resolvedHospitalId);
        models = createModels(db);
      }
    }

    if (!user) {
      const existsElsewhere = await checkUserInOtherPortals(email, password, otp);
      if (existsElsewhere) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!['NURSE', 'HOSPITAL_ADMIN'].includes(user.role)) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, user.password);
      if (ok) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account deactivated' });

    if (otp) {
      if (!isValidLoginOtp(email, otp)) return res.status(401).json({ success: false, message: 'Invalid or expired OTP code' });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.update({ last_login: new Date() });

    const AuditLog = models?.AuditLog;
    if (AuditLog) {
      await AuditLog.create({
        hospital_id: resolvedHospitalId || user.hospital_id,
        user_id: user.id,
        action: 'LOGIN',
        module: 'Auth',
        description: `Nurse ${user.name} logged in`,
        ip_address: req.ip,
      }).catch(console.error);
    }

    const token = generateToken(user);
    const userData = user.toJSON();
    delete userData.password;
    userData.avatar = userData.profile_image || '';
    userData.profileImage = userData.profile_image || '';
    res.json({ success: true, token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const userData = req.user.toJSON();
    delete userData.password;
    userData.avatar = userData.profile_image || '';
    userData.profileImage = userData.profile_image || '';
    res.json({ success: true, data: { user: userData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { password, role, hospital_id, ...updates } = req.body;

    let profileImage = updates.avatar || updates.profileImage;
    if (profileImage && profileImage.startsWith('data:image/')) {
      const matches = profileImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `avatar-${req.user.id}-${Date.now()}.${extension}`;
        // Always store profile avatars locally in /uploads directory
        console.log('Storing nurse avatar locally in /uploads directory.');
        updates.profile_image = await saveBase64Locally(req, profileImage, fileName);
      }
    } else if (profileImage !== undefined) {
      updates.profile_image = profileImage;
    }

    // Clean unmapped/virtual fields before Sequelize update
    delete updates.avatar;
    delete updates.profileImage;

    await req.user.update(updates);
    const userData = req.user.toJSON();
    delete userData.password;
    userData.avatar = userData.profile_image || '';
    userData.profileImage = userData.profile_image || '';
    res.json({ success: true, user: userData, data: { user: userData }, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveBase64Locally = async (req, base64Data, fileName) => {
  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data format');
  }
  const buffer = Buffer.from(matches[2], 'base64');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const pwdError = getPasswordComplexityError(newPassword);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    const { User } = req.models;
    const user = await User.findOne({ where: { id: req.user.id, hospital_id: req.hospitalId } });
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
