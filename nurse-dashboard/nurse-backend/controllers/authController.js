const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { masterDb } = require('../services/databaseResolver');
const { loginOtpStore } = require('./forgotPasswordController');
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

// Simple in-memory cache to map email -> hospitalId to avoid slow sequential DB lookups
const userHospitalCache = new Map();

const checkUserInOtherPortals = async (email, password, otp) => {
  const normEmail = email.toLowerCase();
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
      // Fallback: check cache first to avoid slow scan/queries
      if (userHospitalCache.has(email.toLowerCase())) {
        const cachedHospitalId = userHospitalCache.get(email.toLowerCase());
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
        user = await models.User.findOne({ where: { email, hospital_id: resolvedHospitalId } });
      }

      if (!user) {
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
    }
    
    if (!hospitalCode && !user) {
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
            const [users] = await externalDb.query("SELECT * FROM users WHERE email = ? LIMIT 1", { 
              replacements: [email],
              timeout: 5000
            });
            await externalDb.close().catch(() => {});
            if (users && users.length > 0) {
              const matchedUser = users[0];
              userHospitalCache.set(email.toLowerCase(), conn.hospital_id);
              
              const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, matchedUser.password);
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
    const signedImg = await signAvatarUrl(userData.profile_image);
    userData.avatar = signedImg || '';
    userData.profileImage = signedImg || '';
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
    const signedImg = await signAvatarUrl(userData.profile_image);
    userData.avatar = signedImg || '';
    userData.profileImage = signedImg || '';
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
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
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `avatar-${req.user.id}-${Date.now()}.${extension}`;
        const s3Key = `hospitals/${req.user.hospital_id || req.hospitalId || 'unknown'}/nurses/${req.user.id}/avatars/${Date.now()}.${extension}`;
        
        updates.profile_image = await uploadBase64ToS3(profileImage, s3Key, req, fileName);
      }
    } else if (profileImage !== undefined) {
      if (profileImage && (profileImage.startsWith('http://') || profileImage.startsWith('https://'))) {
        // Do not overwrite database with pre-signed URL
      } else {
        updates.profile_image = profileImage;
      }
    }

    // Clean unmapped/virtual fields before Sequelize update
    delete updates.avatar;
    delete updates.profileImage;

    await req.user.update(updates);
    const userData = req.user.toJSON();
    delete userData.password;
    const signedImg = await signAvatarUrl(userData.profile_image);
    userData.avatar = signedImg || '';
    userData.profileImage = signedImg || '';
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
