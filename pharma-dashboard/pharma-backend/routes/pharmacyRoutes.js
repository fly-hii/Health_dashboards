const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || 'careplus-reports';

const { protect } = require('../middleware/authMiddleware');
const { masterDb } = require('../services/databaseResolver');
const { decrypt } = require('../services/encryptionService');
const { sendOtpEmail } = require('../services/emailService');

const _otpStore = new Map();
const _loginOtpStore = new Map();
const _genOtp = () => crypto.randomInt(100000, 999999).toString();
const _maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  const masked = local.length <= 2 ? local : local[0] + '***' + local.slice(-1);
  return `${masked}@${domain}`;
};

// Simple in-memory cache to map email -> hospitalId to avoid slow sequential DB lookups
const userHospitalCache = new Map();

const checkUserInOtherPortals = async (email, password, otp) => {
  const normEmail = email.toLowerCase();
  const isOtpValid = (email, otp) => {
    if (!otp) return false;
    const record = _loginOtpStore.get(email.toLowerCase());
    return record && record.otp === otp.toString() && Date.now() <= record.expiresAt;
  };

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

  // Check userHospitalCache first
  if (userHospitalCache.has(normEmail)) {
    const cachedHospitalId = userHospitalCache.get(normEmail);
    const { getHospitalConnection } = require('../services/databaseResolver');
    try {
      const externalDb = await getHospitalConnection(cachedHospitalId);
      const [users] = await externalDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
      if (users && users.length > 0) {
        const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
        if (ok) return true;
      }
      const [patients] = await externalDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { replacements: [email] });
      if (patients && patients.length > 0) {
        const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
        if (ok) return true;
      }
    } catch (_) {}
    return false;
  }

  try {
    const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
    const { getHospitalConnection } = require('../services/databaseResolver');
    const { Sequelize } = require('sequelize');

    const checkPromises = connections.map(async (conn) => {
      let externalDb;
      try {
        const decryptedPassword = decrypt(conn.password_encrypted);
        externalDb = new Sequelize(conn.database_name, conn.username, decryptedPassword, {
          host: conn.host, port: conn.port || 3306, dialect: 'mysql', dialectModule: require('mysql2'), logging: false,
          dialectOptions: {
            connectTimeout: 5000,
            ...(conn.ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {})
          },
          pool: { max: 1, min: 0, acquire: 5000, idle: 1000 },
        });
        const [users] = await externalDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { 
          replacements: [email],
          timeout: 5000
        });
        if (users && users.length > 0) {
          userHospitalCache.set(normEmail, conn.hospital_id);
          const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
          await externalDb.close().catch(() => {});
          if (ok) return { success: true };
          return null;
        }
        const [patients] = await externalDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { 
          replacements: [email],
          timeout: 5000
        });
        await externalDb.close().catch(() => {});
        if (patients && patients.length > 0) {
          userHospitalCache.set(normEmail, conn.hospital_id);
          const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
          if (ok) return { success: true };
          return null;
        }
      } catch (_) {
        if (externalDb) await externalDb.close().catch(() => {});
      }
      return null;
    });

    const results = await Promise.all(checkPromises);
    if (results.some(r => r && r.success)) return true;
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

const mapOrderResponse = (order) => {
  const json = order.toJSON();
  const patientDob = order.patient?.dob;
  const age = patientDob ? (new Date().getFullYear() - new Date(patientDob).getFullYear()) : 30;

  // medicines in prescription
  const srcMedicines = order.prescription?.medicines?.map(m => ({
    medicineName: m.name,
    dosage: m.dosage,
    quantity: m.quantity,
    instructions: m.instructions || 'As prescribed',
  })) || [];

  return {
    _id: json.id,
    id: json.id,
    tokenNumber: json.notes || (order.prescription?.appointment?.token_number ? String(order.prescription.appointment.token_number) : '') || `RXN${json.id}`,
    status: json.status,
    patientId: order.patient ? {
      _id: order.patient.id,
      id: order.patient.id,
      name: order.patient.full_name,
      age: age,
      gender: order.patient.gender || 'Male',
      phone: order.patient.phone || '',
    } : null,
    prescriptionId: order.prescription ? {
      _id: order.prescription.id,
      id: order.prescription.id,
      doctorName: order.prescription.doctor?.name || 'Dr. Rohit Mehta',
      department: order.prescription.doctor?.department || 'General Medicine',
      medicines: srcMedicines,
      doctorNotes: order.prescription.instructions || '',
    } : null,
    medicines: srcMedicines,
    totalAmount: parseFloat(json.total_amount) || 120,
    paidAmount: json.payment_status === 'Paid' ? (parseFloat(json.total_amount) || 120) : 0,
    // Sequelize aliases: created_at → createdAt, updated_at → updatedAt in toJSON()
    startedAt: json.processed_at,
    readyAt: json.updatedAt,
    deliveredAt: json.delivered_at,
    createdAt: json.createdAt,
  };
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// @desc    Send OTP to pharmacist
// @route   POST /api/pharmacy/auth/send-otp
router.post('/auth/send-otp', async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ message: 'Store ID or Email is required.' });
    }

    const { getHospitalConnection, masterDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');
    const { sequelize } = require('../config/db');
    const { Op } = require('sequelize');

    let user;
    let resolvedHospitalId;

    // 1. Try default database
    const staticModels = createModels(sequelize);
    user = await staticModels.User.findOne({
      where: {
        [Op.or]: [
          { employee_id: storeId },
          { email: storeId.toLowerCase() }
        ]
      }
    });

    if (user) {
      resolvedHospitalId = user.hospital_id;
    } else {
      // 2. Try tenant databases
      try {
        const [connections] = await masterDb.query('SELECT * FROM db_connections WHERE is_active = 1');
        for (const conn of connections) {
          try {
            const db = await getHospitalConnection(conn.hospital_id);
            const tenantModels = createModels(db);
            const found = await tenantModels.User.findOne({
              where: {
                [Op.or]: [
                  { employee_id: storeId },
                  { email: storeId.toLowerCase() }
                ]
              }
            });
            if (found) {
              user = found;
              resolvedHospitalId = conn.hospital_id;
              break;
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with this Store ID or Email.' });
    }

    if (!['PHARMACIST', 'HOSPITAL_ADMIN'].includes(user.role)) {
      return res.status(403).json({ message: 'This account is not authorized as a Pharmacist.' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Account is deactivated. Contact hospital admin.' });
    }

    if (!user.email) {
      return res.status(400).json({ message: 'User does not have a registered email address.' });
    }

    const otp = _genOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    _loginOtpStore.set(storeId.toLowerCase(), {
      otp,
      expiresAt,
      userId: user.id,
      hospitalId: resolvedHospitalId
    });

    await sendOtpEmail(user.email, user.name || 'Pharmacist', otp, 'Pharmacy Portal', 'login');

    res.json({
      success: true,
      message: `OTP sent to ${_maskEmail(user.email)}`
    });
  } catch (error) {
    console.error('Pharma send OTP error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// FORGOT PASSWORD – OTP FLOW (real email)
// ==========================================

// @route POST /api/pharmacy/auth/forgot-password/send-otp
router.post('/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { getHospitalConnection, masterDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');
    const { sequelize } = require('../config/db');

    // Try shared DB first, then all tenant DBs
    let user;
    const staticModels = createModels(sequelize);
    user = await staticModels.User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      // Try each tenant DB from master
      try {
        const [connections] = await masterDb.query('SELECT * FROM db_connections WHERE is_active = 1');
        for (const conn of connections) {
          try {
            const db = await getHospitalConnection(conn.hospital_id);
            const tenantModels = createModels(db);
            const found = await tenantModels.User.findOne({ where: { email: email.toLowerCase() } });
            if (found) { user = found; break; }
          } catch (_) {}
        }
      } catch (_) {}
    }

    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email. Please contact your hospital admin.' });
    if (!['PHARMACIST', 'HOSPITAL_ADMIN'].includes(user.role)) return res.status(403).json({ success: false, message: 'This email is not registered as a Pharmacist in this portal.' });
    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your hospital admin.' });

    const otp = _genOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    _otpStore.set(email.toLowerCase(), { otp, expiresAt, verified: false, userId: user.id, hospitalId: user.hospital_id });

    await sendOtpEmail(user.email, user.name || 'Pharmacist', otp, 'Pharmacy Portal');

    res.json({ success: true, message: `OTP sent to ${_maskEmail(user.email)}` });
  } catch (error) {
    console.error('Pharma send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// @route POST /api/pharmacy/auth/forgot-password/verify-otp
router.post('/auth/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const record = _otpStore.get(email.toLowerCase());
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
      _otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp.toString()) return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });

    record.verified = true;
    _otpStore.set(email.toLowerCase(), record);
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route POST /api/pharmacy/auth/forgot-password/reset
router.post('/auth/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });

    const record = _otpStore.get(email.toLowerCase());
    if (!record || !record.verified) return res.status(400).json({ success: false, message: 'OTP not verified. Please verify OTP first.' });
    if (Date.now() > record.expiresAt) {
      _otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP session expired. Please start over.' });
    }
    if (record.otp !== otp.toString()) return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const { getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');
    const { sequelize } = require('../config/db');

    let db = sequelize;
    if (record.hospitalId) {
      try { db = await getHospitalConnection(record.hospitalId); } catch (_) {}
    }
    const { User } = createModels(db);
    const user = await User.findOne({ where: { id: record.userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    await user.update({ password: await bcrypt.hash(newPassword, salt) });

    _otpStore.delete(email.toLowerCase());
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Pharma reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// @desc    Pharmacist login
// @route   POST /api/pharmacy/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { storeId, password, otp } = req.body;
    const hospitalCode = req.body.hospitalCode || req.headers['x-hospital-code'] || process.env.HOSPITAL_CODE;

    if (!storeId) return res.status(400).json({ message: 'Store ID or Email is required.' });

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
        return res.status(404).json({ message: `Hospital code "${hospitalCode}" not found` });
      }
      if (hospital.status === 'suspended') {
        return res.status(403).json({ message: 'Hospital account is suspended. Contact CarePlus support.' });
      }
      resolvedHospitalId = hospital.id;

      // Step 2: Resolve tenant DB
      db = await getHospitalConnection(resolvedHospitalId);
      models = createModels(db);
      const { User } = models;
      user = await User.findOne({
        where: {
          [Op.or]: [
            { employee_id: storeId },
            { email: storeId.toLowerCase() }
          ]
        }
      });
    } else {
      // Fallback: check cache first to avoid slow scan/queries
      if (userHospitalCache.has(storeId.toLowerCase())) {
        const cachedHospitalId = userHospitalCache.get(storeId.toLowerCase());
        const [hospRows] = await masterDb.query(
          'SELECT status FROM hospitals WHERE id = ? LIMIT 1',
          { replacements: [cachedHospitalId] }
        );
        const hospital = hospRows?.[0];
        if (hospital?.status === 'suspended') {
          return res.status(403).json({ message: 'Hospital account is suspended. Contact CarePlus support.' });
        }
        resolvedHospitalId = cachedHospitalId;
        db = await getHospitalConnection(resolvedHospitalId);
        models = createModels(db);
        const { User } = models;
        user = await User.findOne({
          where: {
            [Op.or]: [
              { employee_id: storeId },
              { email: storeId.toLowerCase() }
            ]
          }
        });
      }

      if (!user) {
        // Fallback: use default DB connection
        const { sequelize } = require('../config/db');
        const staticModels = createModels(sequelize);
        const { User: StaticUser } = staticModels;

        user = await StaticUser.findOne({
          where: {
            [Op.or]: [
              { employee_id: storeId },
              { email: storeId.toLowerCase() }
            ]
          }
        });

        if (user) {
          resolvedHospitalId = user.hospital_id;
          // Verify hospital status in master registry
          const [hospRows] = await masterDb.query(
            'SELECT status FROM hospitals WHERE id = ? LIMIT 1',
            { replacements: [resolvedHospitalId] }
          );
          const hospital = hospRows?.[0];
          if (hospital?.status === 'suspended') {
            return res.status(403).json({ message: 'Hospital account is suspended. Contact CarePlus support.' });
          }
          db = await getHospitalConnection(resolvedHospitalId);
          models = createModels(db);
        }
      }
    }

    if (!hospitalCode && !user) {
      try {
        const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
        const { Sequelize } = require('sequelize');
        const { decrypt } = require('../services/encryptionService');
        const isOtpValid = (id, code) => {
          const record = _loginOtpStore.get(id.toLowerCase());
          return record && record.otp === code.toString() && Date.now() <= record.expiresAt;
        };
        
        const checkPromises = connections.map(async (conn) => {
          let externalDb;
          try {
            const decryptedPassword = decrypt(conn.password_encrypted);
            externalDb = new Sequelize(conn.database_name, conn.username, decryptedPassword, {
              host: conn.host, port: conn.port || 3306, dialect: 'mysql', dialectModule: require('mysql2'), logging: false,
              dialectOptions: {
                connectTimeout: 5000,
                ...(conn.ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {})
              },
              pool: { max: 1, min: 0, acquire: 5000, idle: 1000 }
            });
            const [users] = await externalDb.query(
              "SELECT * FROM users WHERE email = ? OR employee_id = ? LIMIT 1",
              { replacements: [storeId.toLowerCase(), storeId], timeout: 5000 }
            );
            await externalDb.close().catch(() => {});
            if (users && users.length > 0) {
              const matchedUser = users[0];
              userHospitalCache.set(storeId.toLowerCase(), conn.hospital_id);
              if (matchedUser.email) {
                userHospitalCache.set(matchedUser.email.toLowerCase(), conn.hospital_id);
              }
              const ok = otp ? isOtpValid(storeId, otp) : (password ? await bcrypt.compare(password, matchedUser.password) : false);
              if (ok) {
                return { conn, matchedUser };
              }
            }
          } catch (_) {
            if (externalDb) await externalDb.close().catch(() => {});
          }
          return null;
        });

        const results = await Promise.all(checkPromises);
        const match = results.find(r => r !== null);
        if (match) {
          resolvedHospitalId = match.conn.hospital_id;
          db = await getHospitalConnection(resolvedHospitalId);
          models = createModels(db);
          user = await models.User.findByPk(match.matchedUser.id);
        }
      } catch (_) {}
    }

    if (!user) {
      const existsElsewhere = await checkUserInOtherPortals(storeId, password, otp);
      if (existsElsewhere) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      }
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['PHARMACIST', 'HOSPITAL_ADMIN'].includes(user.role)) {
      let ok = false;
      if (password) {
        ok = await bcrypt.compare(password, user.password);
      } else if (otp) {
        const record = _loginOtpStore.get(storeId.toLowerCase());
        ok = record && record.otp === otp.toString() && Date.now() <= record.expiresAt;
      }
      if (ok) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      } else {
        return res.status(400).json({ message: 'Incorrect password or OTP.' });
      }
    }

    if (user.status === 'Inactive') return res.status(403).json({ message: 'Account deactivated' });

    if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect password.' });
    } else if (otp) {
      const record = _loginOtpStore.get(storeId.toLowerCase());
      if (!record) return res.status(400).json({ message: 'No OTP requested. Please request a new one.' });
      if (Date.now() > record.expiresAt) {
        _loginOtpStore.delete(storeId.toLowerCase());
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }
      if (record.otp !== otp.toString()) return res.status(400).json({ message: 'Invalid OTP code.' });
      _loginOtpStore.delete(storeId.toLowerCase());
    } else {
      return res.status(400).json({ message: 'Password or OTP is required.' });
    }

    const token = jwt.sign(
      { id: user.id, hospitalId: user.hospital_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    const json = user.toJSON();
    const signedImg = await signAvatarUrl(json.profile_image);
    res.json({
      success: true,
      token,
      user: {
        _id: json.id,
        id: json.id,
        fullName: json.name,
        name: json.name,
        email: json.email,
        employeeId: json.employee_id,
        role: json.role,
        phone: json.phone,
        profilePhoto: signedImg,
        profileImage: signedImg,
        profile_image: signedImg,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PROFILE ENDPOINTS
// ==========================================

router.get('/profile', protect, async (req, res) => {
  const json = req.user.toJSON();
  const signedImg = await signAvatarUrl(json.profile_image);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({
    _id: json.id,
    id: json.id,
    fullName: json.name,
    name: json.name,
    email: json.email,
    employeeId: json.employee_id,
    role: json.specialization || 'Pharmacist',
    phone: json.phone,
    profilePhoto: signedImg,
    profileImage: signedImg,
    storeLocation: json.address || '',
  });
});

router.put('/profile', protect, async (req, res) => {
  try {
    let imageToSave = req.user.profile_image;
    if (profilePhoto !== undefined) {
      if (profilePhoto && (profilePhoto.startsWith('http://') || profilePhoto.startsWith('https://'))) {
        // Do not overwrite database with pre-signed URL
      } else {
        imageToSave = profilePhoto;
      }
    }

    await req.user.update({
      name: fullName !== undefined ? (fullName || req.user.name) : req.user.name,
      email: email !== undefined ? (email || req.user.email) : req.user.email,
      phone: phone !== undefined ? (phone || req.user.phone) : req.user.phone,
      profile_image: imageToSave,
      specialization: role !== undefined ? role : req.user.specialization,
      address: storeLocation !== undefined ? storeLocation : req.user.address,
    });
    const json = req.user.toJSON();
    const signedImg = await signAvatarUrl(json.profile_image);
    res.json({
      _id: json.id,
      id: json.id,
      fullName: json.name,
      name: json.name,
      email: json.email,
      employeeId: json.employee_id,
      role: json.specialization || 'Pharmacist',
      phone: json.phone,
      profilePhoto: signedImg,
      profileImage: signedImg,
      storeLocation: json.address || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

const uploadBase64ToS3 = async (base64Data, s3Key, req, fileName) => {
  const isMock = !process.env.AWS_ACCESS_KEY_ID || 
                 process.env.AWS_ACCESS_KEY_ID === 'your_access_key' || 
                 process.env.AWS_ACCESS_KEY_ID.startsWith('YOUR_');

  if (isMock) {
    console.warn('⚠️ AWS S3 credentials are default placeholders. Bypassing upload to store locally.');
    return saveBase64Locally(req, base64Data, fileName);
  }

  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data format');
  }
  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  console.log('Uploading avatar to AWS S3 bucket:', BUCKET);
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
};

const getSignedDownloadUrl = async (s3Key, expiresIn = 604800) => {
  const isMock = !process.env.AWS_ACCESS_KEY_ID || 
                 process.env.AWS_ACCESS_KEY_ID === 'your_access_key' || 
                 process.env.AWS_ACCESS_KEY_ID.startsWith('YOUR_');
  if (isMock) {
    return `https://mock-s3-bucket.s3.amazonaws.com/${s3Key}?signed=true`;
  }
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn });
};

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

router.post('/profile/photo', protect, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    
    let imageUrl = '';
    if (photoUrl && photoUrl.startsWith('data:image/')) {
      const matches = photoUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `avatar-${req.user.id}-${Date.now()}.${extension}`;
        const s3Key = `hospitals/${req.hospitalId || 'unknown'}/pharmacists/${req.user.id}/avatars/${Date.now()}.${extension}`;
        
        imageUrl = await uploadBase64ToS3(photoUrl, s3Key, req, fileName);
      } else {
        imageUrl = photoUrl;
      }
    } else {
      imageUrl = photoUrl;
    }

    await req.user.update({ profile_image: imageUrl });
    const signedImg = await signAvatarUrl(imageUrl);
    res.json({ success: true, profilePhoto: signedImg, message: 'Photo updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/settings', protect, async (req, res) => {
  res.json({ success: true, message: 'Settings updated' });
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const pwdError = getPasswordComplexityError(newPassword);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }

    const { User } = req.models;
    const user = await User.findOne({ where: { id: req.user.id, hospital_id: req.hospitalId } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PRESCRIPTION ENDPOINTS
// ==========================================

router.get('/prescriptions/:id', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { id } = req.params;

    let order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      },
      include: [
        { model: Patient, as: 'patient' },
        { 
          model: Prescription, 
          as: 'prescription',
          include: [
            { model: User, as: 'doctor', attributes: ['name', 'department'] },
            { model: PrescriptionMedicine, as: 'medicines' },
            { model: Appointment, as: 'appointment', attributes: ['token_number'] }
          ]
        }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Prescription not found' });

    const json = order.toJSON();
    const patientDob = order.patient?.dob;
    const age = patientDob ? (new Date().getFullYear() - new Date(patientDob).getFullYear()) : 30;

    const formattedResponse = {
      _id: json.id,
      tokenNumber: json.notes || (order.prescription?.appointment?.token_number ? String(order.prescription.appointment.token_number) : '') || `RXN${json.id}`,
      status: json.status,
      patient: {
        name: order.patient?.full_name || 'Unknown Patient',
        age: age,
        gender: order.patient?.gender || 'Male',
        phone: order.patient?.phone || '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${order.patient?.full_name || 'Patient'}`
      },
      doctor: {
        name: order.prescription?.doctor?.name || 'Dr. Rohit Mehta',
        department: order.prescription?.doctor?.department || 'General Medicine'
      },
      visitDate: order.prescription?.createdAt || order.prescription?.created_at || order.createdAt || order.created_at,
      medicines: order.prescription?.medicines?.map(med => ({
        name: med.name,
        dosage: med.dosage,
        quantity: med.quantity,
        instructions: med.instructions || 'As prescribed'
      })) || [],
      doctorNotes: order.prescription?.instructions || ''
    };

    res.json(formattedResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/prescriptions/:id/status', protect, async (req, res) => {
  try {
    const { PharmacyOrder } = req.models;
    const { id } = req.params;
    const { status } = req.body;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      }
    });

    if (!order) return res.status(404).json({ message: 'Prescription not found' });

    order.status = status;
    if (status === 'Processing') order.processed_at = new Date();
    if (status === 'Delivered') {
      order.delivered_at = new Date();
      order.payment_status = 'Paid';
    }
    await order.save();

    if (req.io) {
      req.io.to(`hospital_${req.hospitalId}`).emit('orderStatusUpdated', order.toJSON());
    }

    res.json({ message: `Status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// ORDER ENDPOINTS
// ==========================================

router.get('/orders/:id', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { id } = req.params;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      },
      include: [
        { model: Patient, as: 'patient' },
        { 
          model: Prescription, 
          as: 'prescription',
          include: [
            { model: User, as: 'doctor', attributes: ['name', 'department'] },
            { model: PrescriptionMedicine, as: 'medicines' },
            { model: Appointment, as: 'appointment', attributes: ['token_number'] }
          ]
        }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(mapOrderResponse(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders/delivered/:id', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { id } = req.params;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId,
        status: 'Delivered'
      },
      include: [
        { model: Patient, as: 'patient' },
        { 
          model: Prescription, 
          as: 'prescription',
          include: [
            { model: User, as: 'doctor', attributes: ['name', 'department'] },
            { model: PrescriptionMedicine, as: 'medicines' },
            { model: Appointment, as: 'appointment', attributes: ['token_number'] }
          ]
        }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Delivered Order not found' });
    res.json(mapOrderResponse(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/orders/:id/status', protect, async (req, res) => {
  try {
    const { PharmacyOrder } = req.models;
    const { id } = req.params;
    const { status } = req.body;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    if (status === 'Processing') order.processed_at = new Date();
    if (status === 'Delivered') {
      order.delivered_at = new Date();
      order.payment_status = 'Paid';
    }
    await order.save();

    if (req.io) {
      req.io.to(`hospital_${req.hospitalId}`).emit('orderStatusUpdated', order.toJSON());
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/orders/:id/print', protect, async (req, res) => {
  res.json({ success: true, message: 'Printed successfully' });
});

// ==========================================
// PATIENTS & DOCTORS DATA FETCHERS
// ==========================================

router.get('/patients', protect, async (req, res) => {
  try {
    const { Patient } = req.models;
    const patients = await Patient.findAll({
      where: { hospital_id: req.hospitalId }
    });
    const mapped = patients.map(p => {
      const json = p.toJSON();
      return {
        _id: json.id,
        id: json.id,
        name: json.full_name,
        phone: json.phone,
        gender: json.gender,
        age: json.dob ? (new Date().getFullYear() - new Date(json.dob).getFullYear()) : 30,
      };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/doctors', protect, async (req, res) => {
  try {
    const { User } = req.models;
    const doctors = await User.findAll({
      where: { hospital_id: req.hospitalId, role: 'DOCTOR', status: 'Active' }
    });
    const names = doctors.map(d => `Dr. ${d.name}`);
    res.json(names);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// MANUAL ORDER CREATION ENDPOINT
// ==========================================

router.post('/orders/manual', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, PrescriptionMedicine } = req.models;
    const { patientId, doctorName, medicines } = req.body;

    if (!patientId || !doctorName || !medicines || medicines.length === 0) {
      return res.status(400).json({ message: 'Patient, Doctor, and at least one medicine are required.' });
    }

    // Generate token number RXN + 5 digits
    const code = Math.floor(10000 + Math.random() * 90000);
    const tokenNumber = `RXN${code}`;

    const { User } = req.models;
    let doctor = await User.findOne({
      where: { hospital_id: req.hospitalId, role: 'DOCTOR', name: doctorName }
    });
    if (!doctor) {
      // Strip 'Dr. ' prefix if present and check again
      const cleanName = doctorName.replace(/^Dr\.\s+/i, '');
      doctor = await User.findOne({
        where: { hospital_id: req.hospitalId, role: 'DOCTOR', name: cleanName }
      });
    }
    if (!doctor) {
      // Fallback: first available active doctor in the hospital
      doctor = await User.findOne({
        where: { hospital_id: req.hospitalId, role: 'DOCTOR', status: 'Active' },
        order: [['id', 'ASC']]
      });
    }
    const doctor_id = doctor?.id ?? 1;

    const prescription = await Prescription.create({
      hospital_id: req.hospitalId,
      patient_id: patientId,
      doctor_id,
      diagnosis: 'Created manually at counter.',
      instructions: 'Created manually at counter.',
      status: 'Active',
    });

    for (const m of medicines) {
      await PrescriptionMedicine.create({
        prescription_id: prescription.id,
        name: m.name,
        dosage: m.dosage,
        quantity: m.quantity,
        instructions: m.instructions || 'As prescribed',
      });
    }

    const order = await PharmacyOrder.create({
      hospital_id: req.hospitalId,
      prescription_id: prescription.id,
      patient_id: patientId,
      status: 'Pending',
      notes: tokenNumber, // Store token number in notes!
      total_amount: medicines.reduce((sum, m) => sum + (m.quantity * 12), 0) || 120,
      payment_status: 'Unpaid',
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// NOTIFICATIONS ENDPOINTS
// ==========================================

router.get('/notifications', protect, async (req, res) => {
  try {
    const { Notification } = req.models;
    const notifications = await Notification.findAll({
      where: { hospital_id: req.hospitalId, [Op.or]: [{ user_id: req.user.id }, { user_id: null }] },
      order: [['created_at', 'DESC']]
    });
    const mapped = notifications.map(n => {
      const json = n.toJSON();
      return {
        _id: json.id,
        id: json.id,
        title: json.title,
        message: json.message,
        isRead: json.status === 'read',
        createdAt: json.createdAt || json.created_at,
      };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    const { Notification } = req.models;
    const notification = await Notification.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId, user_id: req.user.id }
    });
    if (notification) {
      notification.status = 'read';
      notification.read_at = new Date();
      await notification.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/notifications/read-all', protect, async (req, res) => {
  try {
    const { Notification } = req.models;
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { user_id: req.user.id, hospital_id: req.hospitalId, status: 'unread' } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
