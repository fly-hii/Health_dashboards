const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op, literal } = require('sequelize');
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

const { Patient, Hospital, AuditLog } = require('../models');
const { masterDb } = require('../services/databaseResolver');
const { loginOtpStore } = require('./forgotPasswordController');
const { sendOtpEmail } = require('../services/emailService');

const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  const masked = local.length <= 2 ? local : local[0] + '***' + local.slice(-1);
  return `${masked}@${domain}`;
};


// Simple in-memory cache to map email/identifier -> hospitalId to avoid slow sequential DB lookups
const userHospitalCache = new Map();

const checkUserInOtherPortals = async (email, password) => {
  const normEmail = email ? email.toLowerCase() : '';
  try {
    const [superAdmins] = await masterDb.query("SELECT password FROM super_admin_users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (superAdmins && superAdmins.length > 0) {
      const ok = await bcrypt.compare(password, superAdmins[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  const { sharedSaasDb } = require('../services/databaseResolver');
  try {
    const [users] = await sharedSaasDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (users && users.length > 0) {
      const ok = await bcrypt.compare(password, users[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  // Check userHospitalCache first
  if (normEmail && userHospitalCache.has(normEmail)) {
    const cachedHospitalId = userHospitalCache.get(normEmail);
    const { getHospitalConnection } = require('../services/databaseResolver');
    try {
      const externalDb = await getHospitalConnection(cachedHospitalId);
      const [users] = await externalDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
      if (users && users.length > 0) {
        const ok = await bcrypt.compare(password, users[0].password);
        if (ok) return true;
      }
    } catch (_) {}
    return false;
  }

  try {
    const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
    const { decrypt } = require('../services/encryptionService');
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
        await externalDb.close().catch(() => {});
        if (users && users.length > 0) {
          if (normEmail) {
            userHospitalCache.set(normEmail, conn.hospital_id);
          }
          const ok = await bcrypt.compare(password, users[0].password);
          if (ok) return { success: true };
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

const generateToken = (patient) =>
  jwt.sign(
    { id: patient.id, hospitalId: patient.hospital_id, role: 'PATIENT' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

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

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      full_name, email, password, phone, dob, gender,
      blood_group, address, hospital_id, hospitalCode
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const pwdError = getPasswordComplexityError(password);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    // 1. Determine hospital ID
    let resolvedHospitalId = hospital_id;
    let db, models;

    if (hospitalCode) {
      const [hospRows] = await masterDb.query(
        'SELECT id, status FROM hospitals WHERE code = ? LIMIT 1',
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
    } else if (resolvedHospitalId) {
      const [hospRows] = await masterDb.query(
        'SELECT status FROM hospitals WHERE id = ? LIMIT 1',
        { replacements: [resolvedHospitalId] }
      );
      const hospital = hospRows?.[0];
      if (hospital?.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
      }
    } else {
      // Find first active or trial hospital, fallback to any available
      const [hospRows] = await masterDb.query(
        "SELECT id FROM hospitals WHERE status IN ('active', 'trial') ORDER BY id ASC LIMIT 1"
      );
      resolvedHospitalId = hospRows?.[0]?.id || 5;
    }

    // 2. Resolve database for the tenant
    db = await getHospitalConnection(resolvedHospitalId);
    models = createModels(db);

    const existing = await models.Patient.findOne({ where: { email, hospital_id: resolvedHospitalId } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Generate patient ID (scoped to this hospital in the shared SaaS DB)
    const today = new Date();
    const prefix = `PAT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const last = await models.Patient.findOne({
      where: { hospital_id: resolvedHospitalId, patient_id: { [Op.like]: `${prefix}%` } },
      order: [['patient_id', 'DESC']],
    });
    const seq = last?.patient_id ? parseInt(last.patient_id.replace(prefix, '')) + 1 : 1;
    const patient_id = `${prefix}${String(seq).padStart(3, '0')}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const patient = await models.Patient.create({
      hospital_id: resolvedHospitalId,
      patient_id,
      full_name,
      email,
      password: hashedPassword,
      phone,
      dob,
      gender,
      blood_group,
      address,
      status: 'Active',
      is_portal_user: true,
    });

    const token = generateToken(patient);
    const { password: _, ...patientData } = patient.toJSON();
    
    // Map database fields to the names the frontend expects
    patientData.fullName = patientData.full_name;
    patientData.mobile = patientData.phone;
    patientData.bloodGroup = patientData.blood_group;
    patientData.profileImage = await signAvatarUrl(patientData.profile_image);
    patientData._id = patientData.id;

    res.status(201).json({ success: true, token, user: patientData });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, mobileNumber } = req.body;

  try {
    if ((!email && !mobileNumber) || !password)
      return res.status(400).json({ success: false, message: 'Email or Mobile Number and password required' });

    const lookup = mobileNumber ? { phone: mobileNumber } : { email };

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let resolvedHospitalId;
    let db, models;
    let patient;

    const cacheKey = email ? email.toLowerCase() : (mobileNumber ? `phone:${mobileNumber}` : null);

    if (cacheKey && userHospitalCache.has(cacheKey)) {
      const cachedHospitalId = userHospitalCache.get(cacheKey);
      const [hospRows] = await masterDb.query(
        'SELECT status FROM hospitals WHERE id = ? LIMIT 1',
        { replacements: [cachedHospitalId] }
      );
      const hospital = hospRows?.[0];
      if (hospital?.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
      }
      resolvedHospitalId = cachedHospitalId;
      db = await getHospitalConnection(resolvedHospitalId);
      models = createModels(db);
      patient = await models.Patient.findOne({ where: lookup });
    }

    if (!patient) {
      // Look up patient across all hospitals — pick the most recently active record
      // MySQL-compatible null-safe ordering: rows with NULL last_login sort last
      const matches = await Patient.findAll({
        where: lookup,
        order: literal('ISNULL(last_login) ASC, last_login DESC'),
      });
      patient = matches[0] || null;
      if (patient) {
        resolvedHospitalId = patient.hospital_id;
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
    
    if (!patient) {
      try {
        const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
        const { Sequelize } = require('sequelize');
        const { decrypt } = require('../services/encryptionService');
        
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
            const [patients] = await externalDb.query(
              "SELECT * FROM patients WHERE email = ? OR phone = ? LIMIT 1",
              { replacements: [email || null, mobileNumber || null], timeout: 5000 }
            );
            await externalDb.close().catch(() => {});
            if (patients && patients.length > 0) {
              const matchedPatient = patients[0];
              if (email) {
                userHospitalCache.set(email.toLowerCase(), conn.hospital_id);
              }
              if (mobileNumber) {
                userHospitalCache.set(`phone:${mobileNumber}`, conn.hospital_id);
              }
              const ok = await bcrypt.compare(password, matchedPatient.password);
              if (ok) {
                return { conn, matchedPatient };
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
          patient = await models.Patient.findByPk(match.matchedPatient.id);
        }
      } catch (_) {}
    }
    
    if (!patient) {
      if (email) {
        const existsElsewhere = await checkUserInOtherPortals(email, password);
        if (existsElsewhere) {
          return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
        }
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (patient.status === 'Inactive')
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await patient.update({ last_login: new Date() });

    const token = generateToken(patient);
    const { password: _, ...patientData } = patient.toJSON();
    
    // Map database fields to the names the frontend expects
    patientData.fullName = patientData.full_name;
    patientData.mobile = patientData.phone;
    patientData.bloodGroup = patientData.blood_group;
    patientData.profileImage = await signAvatarUrl(patientData.profile_image);
    patientData._id = patientData.id;

    res.json({ success: true, token, user: patientData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { mobileNumber, email, hospitalCode } = req.body;
    const target = email || mobileNumber;
    if (!target) {
      return res.status(400).json({ success: false, message: 'Mobile number or Email is required' });
    }

    const lookup = email ? { email: email.toLowerCase() } : { phone: mobileNumber };

    const { getHospitalConnection, sharedSaasDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let patient;
    let resolvedHospitalId;

    if (hospitalCode) {
      // Resolve hospital by code from master registry
      const [hospRows] = await masterDb.query(
        'SELECT id, status FROM hospitals WHERE code = ? LIMIT 1',
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

      // Look up patient in tenant DB
      const sharedModels = createModels(sharedSaasDb);
      patient = await sharedModels.Patient.findOne({ where: { ...lookup, hospital_id: resolvedHospitalId } });
      if (!patient) {
        try {
          const db = await getHospitalConnection(resolvedHospitalId);
          const tenantModels = createModels(db);
          patient = await tenantModels.Patient.findOne({ where: lookup });
        } catch (_) {}
      }
    } else {
      // Check shared SaaS DB — pick most recently active record across all hospitals
      // MySQL-compatible null-safe ordering: rows with NULL last_login sort last
      const sharedModels = createModels(sharedSaasDb);
      const allMatches = await sharedModels.Patient.findAll({
        where: lookup,
        order: literal('ISNULL(last_login) ASC, last_login DESC'),
      });

      patient = allMatches[0] || null;
    }

    if (!patient) {
      // Search across tenant DBs
      try {
        const [connections] = await masterDb.query('SELECT * FROM db_connections WHERE is_active = 1');
        for (const conn of connections) {
          try {
            const db = await getHospitalConnection(conn.hospital_id);
            const tenantModels = createModels(db);
            const found = await tenantModels.Patient.findOne({ where: lookup });
            if (found) {
              patient = found;
              resolvedHospitalId = conn.hospital_id;
              break;
            }
          } catch (_) {}
        }
      } catch (_) {}
    } else {
      resolvedHospitalId = patient.hospital_id;
    }


    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient account found with these details.' });
    }

    if (patient.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    if (!patient.email) {
      return res.status(400).json({ success: false, message: 'Patient account does not have a registered email address. Please contact support.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    loginOtpStore.set(target.toLowerCase(), {
      otp,
      expiresAt,
      patientId: patient.id,
      hospitalId: resolvedHospitalId
    });

    await sendOtpEmail(patient.email, patient.full_name || 'Patient', otp, 'Patient Portal', 'login');

    res.json({
      success: true,
      message: `OTP sent to ${maskEmail(patient.email)}`
    });
  } catch (error) {
    console.error('Patient sendOtp error:', error);
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

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const { password: _, ...patientData } = req.user.toJSON();
    patientData.fullName = patientData.full_name;
    patientData.mobile = patientData.phone;
    patientData.bloodGroup = patientData.blood_group;
    patientData.profileImage = await signAvatarUrl(patientData.profile_image);
    patientData._id = patientData.id;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ success: true, user: patientData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, dob, gender, mobile, address, bloodGroup, profileImage } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (dob !== undefined) updates.dob = dob;
    if (gender !== undefined) updates.gender = gender;
    if (mobile !== undefined) updates.phone = mobile;
    if (address !== undefined) updates.address = address;
    if (bloodGroup !== undefined) updates.blood_group = bloodGroup;

    if (profileImage !== undefined) {
      if (profileImage && profileImage.startsWith('data:image/')) {
        const matches = profileImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const extension = contentType.split('/')[1] || 'jpg';
          const fileName = `avatar-${req.user.id}-${Date.now()}.${extension}`;
          const s3Key = `hospitals/${req.user.hospital_id || 'unknown'}/patients/${req.user.id}/avatars/${Date.now()}.${extension}`;
          
          updates.profile_image = await uploadBase64ToS3(profileImage, s3Key, req, fileName);
        }
      } else {
        if (profileImage && (profileImage.startsWith('http://') || profileImage.startsWith('https://'))) {
          // Do not overwrite database with pre-signed URL
        } else {
          updates.profile_image = profileImage;
        }
      }
    }

    await req.user.update(updates);
    const { password: _, ...patientData } = req.user.toJSON();
    patientData.fullName = patientData.full_name;
    patientData.mobile = patientData.phone;
    patientData.bloodGroup = patientData.blood_group;
    patientData.profileImage = await signAvatarUrl(patientData.profile_image);
    patientData._id = patientData.id;
    
    res.json({ success: true, user: patientData, profile: patientData, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const pwdError = getPasswordComplexityError(newPassword);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    const patient = await Patient.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, patient.password);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    await patient.update({ password: await bcrypt.hash(newPassword, salt) });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  const { mobileNumber, email, otp } = req.body;
  const target = email || mobileNumber;

  try {
    if (!target || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP are required' });
    }

    const record = loginOtpStore.get(target.toLowerCase());
    if (!record) {
      return res.status(400).json({ success: false, message: 'No OTP request found. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
      loginOtpStore.delete(target.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    // Single use: delete once validated
    loginOtpStore.delete(target.toLowerCase());

    const { getHospitalConnection, sharedSaasDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let db = sharedSaasDb;
    if (record.hospitalId) {
      try {
        db = await getHospitalConnection(record.hospitalId);
      } catch (_) {}
    }

    const models = createModels(db);
    const patient = await models.Patient.findOne({ where: { id: record.patientId } });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient account found matching these details' });
    }

    if (patient.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    await patient.update({ last_login: new Date() });

    const token = generateToken(patient);
    const { password: _, ...patientData } = patient.toJSON();
    
    // Map database fields to the names the frontend expects
    patientData.fullName = patientData.full_name;
    patientData.mobile = patientData.phone;
    patientData.bloodGroup = patientData.blood_group;
    patientData.profileImage = await signAvatarUrl(patientData.profile_image);
    patientData._id = patientData.id;

    res.json({ success: true, token, user: patientData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword, sendOtp, verifyOtp };
