'use strict';

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { SuperAdmin, AuditLog, Hospital, Subscription, Payment, DbConnection } = require('../models');
const { masterDb } = require('../config/masterDatabase');
const { encrypt } = require('../services/encryptionService');
const { sharedSaasDb } = require('../services/databaseResolver');
const { loginOtpStore } = require('./forgotPasswordController');
const { sendWelcomeEmail } = require('../services/emailService');

const isValidLoginOtp = (email, otp) => {
  const record = loginOtpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) { loginOtpStore.delete(email.toLowerCase()); return false; }
  if (record.otp !== otp.toString()) return false;
  loginOtpStore.delete(email.toLowerCase());
  return true;
};

const checkUserInOtherPortals = async (email, password, otp) => {
  const isOtpValid = (email, otp) => {
    if (!otp) return false;
    const record = loginOtpStore.get(email.toLowerCase());
    return record && record.otp === otp.toString() && Date.now() <= record.expiresAt;
  };

  const { sharedSaasDb } = require('../services/databaseResolver');
  try {
    const [users] = await sharedSaasDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (users && users.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
      if (ok) return true;
    }
  } catch (err) {
    console.error("Error checking sharedSaasDb.users:", err);
  }

  try {
    const [patients] = await sharedSaasDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { replacements: [email] });
    if (patients && patients.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
      if (ok) return true;
    }
  } catch (err) {
    console.error("Error checking sharedSaasDb.patients:", err);
  }

  try {
    const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
    const { decrypt } = require('../services/encryptionService');
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
      } catch (err) {
        console.error(`Error checking external connection ${conn.database_name}:`, err);
      }
    }
  } catch (err) {
    console.error("Error querying external db_connections:", err);
  }

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
    if (!admin) {
      const existsElsewhere = await checkUserInOtherPortals(email, password, otp);
      if (existsElsewhere) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.is_active)
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    if (otp) {
      if (!isValidLoginOtp(email, otp))
        return res.status(401).json({ success: false, message: 'Invalid or expired OTP code' });
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

const registerHospitalPublic = async (req, res) => {
  const {
    name, code, email, adminPassword, plan = 'basic',
    address, phone, city, state, country,
    billingCycle = 'monthly', amount = 0, paymentMethod = 'card',
    database_type = 'shared',
    db_host, db_port = 3306, db_name, db_user, db_password, db_ssl = false
  } = req.body;

  if (!name || !code || !email || !adminPassword) {
    return res.status(400).json({ success: false, message: 'name, code, email, and adminPassword are required' });
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(String(email))) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  const adminPwdError = getPasswordComplexityError(adminPassword);
  if (adminPwdError) {
    return res.status(400).json({ success: false, message: adminPwdError });
  }

  // Pre-test external connection if external database is chosen
  let externalDb = null;
  if (database_type === 'external') {
    if (!db_host || !db_name || !db_user || !db_password) {
      return res.status(400).json({ success: false, message: 'All database credentials are required for BYOD configuration' });
    }
    try {
      const { Sequelize } = require('sequelize');
      externalDb = new Sequelize(db_name, db_user, db_password, {
        host: db_host,
        port: parseInt(db_port) || 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: false,
        pool: { max: 1, min: 0, acquire: 15000, idle: 5000 },
        dialectOptions: db_ssl === 'true' || db_ssl === true ? { ssl: { require: true, rejectUnauthorized: false } } : {},
      });
      await externalDb.authenticate();
    } catch (err) {
      return res.status(400).json({ success: false, message: `Could not connect to your external database: ${err.message}` });
    }
  }

  const t = await masterDb.transaction();
  try {
    const { Op } = require('sequelize');
    const existing = await Hospital.findOne({ where: { [Op.or]: [{ code: code.toUpperCase() }, { email }] } });
    if (existing) {
      await t.rollback();
      if (externalDb) await externalDb.close().catch(() => {});
      return res.status(409).json({ success: false, message: 'Hospital code or email already exists' });
    }

    // Calculate expiry date
    const planExpiresAt = new Date();
    if (billingCycle === 'monthly') {
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
    } else {
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 1); // fallback
    }

    // Map plan user limits
    let maxUsers = 10;
    if (plan === 'standard') maxUsers = 50;
    else if (plan === 'premium') maxUsers = 200;
    else if (plan === 'enterprise') maxUsers = 1000;

    // Create hospital record in careplus_master
    const hospital = await Hospital.create({
      name,
      code: code.toUpperCase(),
      email,
      phone,
      address,
      city,
      state,
      country: country || 'India',
      plan,
      status: 'active',
      plan_expires_at: planExpiresAt,
      max_users: maxUsers,
      database_type
    }, { transaction: t });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // If external DB, build tables and insert records there
    if (database_type === 'external' && externalDb) {
      // 1. Create hospitals table
      await externalDb.query(`
        CREATE TABLE IF NOT EXISTS hospitals (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(200) NOT NULL,
          code VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(200) UNIQUE,
          phone VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100) DEFAULT 'India',
          logo_url TEXT,
          status ENUM('active', 'suspended', 'trial', 'expired') DEFAULT 'trial',
          plan ENUM('basic', 'standard', 'premium', 'enterprise') DEFAULT 'basic',
          plan_expires_at DATETIME,
          max_users INT DEFAULT 10,
          max_patients INT DEFAULT 500,
          database_type ENUM('shared', 'external') DEFAULT 'shared',
          settings JSON,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB;
      `);

      // 2. Create users table
      await externalDb.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          hospital_id INT,
          name VARCHAR(200) NOT NULL,
          email VARCHAR(200) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'PATIENT') NOT NULL DEFAULT 'HOSPITAL_ADMIN',
          department VARCHAR(100) DEFAULT 'OTHERS',
          status ENUM('Active', 'Inactive') DEFAULT 'Active',
          phone VARCHAR(20),
          profile_image TEXT,
          address TEXT,
          employee_id VARCHAR(50),
          specialization VARCHAR(200),
          experience INT,
          qualification VARCHAR(200),
          consultation_fee DECIMAL(10,2) DEFAULT NULL,
          license_number VARCHAR(100) DEFAULT NULL,
          bio TEXT DEFAULT NULL,
          shift ENUM('Morning', 'Evening', 'Night') DEFAULT 'Morning',
          schedule_days JSON,
          schedule_start VARCHAR(20) DEFAULT '09:00 AM',
          schedule_end VARCHAR(20) DEFAULT '05:00 PM',
          availability_status ENUM('Available', 'On Leave', 'Busy') DEFAULT 'Available',
          last_login DATETIME,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      // 3. Create db_connections record in careplus_master registry
      const encPwd = encrypt(db_password);
      await DbConnection.create({
        hospital_id: hospital.id,
        host: db_host,
        port: parseInt(db_port) || 3306,
        database_name: db_name,
        username: db_user,
        password_encrypted: encPwd,
        ssl_enabled: db_ssl === 'true' || db_ssl === true,
        is_active: true,
        test_status: 'success',
        last_tested_at: new Date()
      }, { transaction: t });

      // 4. Insert hospital row in BYOD DB
      await externalDb.query(
        `INSERT INTO hospitals (id, name, code, email, phone, address, city, state, country, plan, status, plan_expires_at, max_users, max_patients, database_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [
            hospital.id,
            name,
            code.toUpperCase(),
            email,
            phone || null,
            address || null,
            city || null,
            state || null,
            country || 'India',
            plan,
            'active',
            planExpiresAt,
            maxUsers,
            500, // max_patients default
            database_type
          ]
        }
      );

      // 5. Insert admin user row in BYOD DB
      await externalDb.query(
        `INSERT INTO users (hospital_id, name, email, password, role, department, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'HOSPITAL_ADMIN', 'OTHERS', 'Active', NOW(), NOW())`,
        {
          replacements: [hospital.id, `${name} Admin`, email, hashedPassword]
        }
      );
    } else {
      // Insert Hospital row in sharedSaasDb to satisfy foreign key constraint
      await sharedSaasDb.query(
        `INSERT INTO hospitals (id, name, code, email, phone, address, city, state, country, plan, status, plan_expires_at, max_users, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [
            hospital.id,
            name,
            code.toUpperCase(),
            email,
            phone || null,
            address || null,
            city || null,
            state || null,
            country || 'India',
            plan,
            'active',
            planExpiresAt,
            maxUsers
          ]
        }
      );

      // Insert admin user row in sharedSaasDb
      await sharedSaasDb.query(
        `INSERT INTO users (hospital_id, name, email, password, role, department, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'HOSPITAL_ADMIN', 'OTHERS', 'Active', NOW(), NOW())`,
        {
          replacements: [hospital.id, `${name} Admin`, email, hashedPassword]
        }
      );
    }

    // Create Subscription record in careplus_master
    const subscription = await Subscription.create({
      hospital_id: hospital.id,
      plan,
      status: 'active',
      amount,
      billing_cycle: billingCycle,
      starts_at: new Date(),
      expires_at: planExpiresAt
    }, { transaction: t });

    // Create Payment record in careplus_master
    const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    await Payment.create({
      hospital_id: hospital.id,
      subscription_id: subscription.id,
      amount,
      currency: 'INR',
      status: 'success',
      payment_method: paymentMethod,
      transaction_id: transactionId,
      paid_at: new Date()
    }, { transaction: t });

    // Audit log
    await AuditLog.create({
      hospital_id: hospital.id,
      action: 'CREATE',
      module: 'Subscription',
      description: `Public self-registration for hospital "${name}" with plan "${plan}" (DB Type: ${database_type})`,
      ip_address: req.ip
    }, { transaction: t });

    await t.commit();
    if (externalDb) await externalDb.close().catch(() => {});

    // Send welcome email with credentials and payment details (non-blocking)
    sendWelcomeEmail({
      to: email,
      hospitalName: name,
      hospitalCode: hospital.code,
      adminEmail: email,
      adminPassword,          // plain-text password sent to the registering user
      plan,
      billingCycle,
      amount,
      transactionId,
      planExpiresAt,
    }).catch(err => console.error('⚠️  Welcome email failed (non-critical):', err.message));

    res.status(201).json({
      success: true,
      message: `Hospital "${name}" successfully registered and subscribed.`,
      data: {
        hospitalId: hospital.id,
        name,
        code: hospital.code,
        plan,
        status: 'active',
        planExpiresAt,
        transactionId
      }
    });
  } catch (error) {
    await t.rollback();
    if (externalDb) await externalDb.close().catch(() => {});
    console.error('registerHospitalPublic error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const testDbConnectionPublic = async (req, res) => {
  const { host, port = 3306, database_name, username, password, ssl_enabled = false } = req.body;
  if (!host || !database_name || !username || !password) {
    return res.status(400).json({ success: false, message: 'host, database_name, username, password are required' });
  }

  try {
    const { testExternalConnection } = require('../services/databaseResolver');
    await testExternalConnection({
      host,
      port: parseInt(port) || 3306,
      database_name,
      username,
      password,
      ssl_enabled: ssl_enabled === 'true' || ssl_enabled === true
    });
    res.json({ success: true, message: '✅ Connection test successful — database credentials are valid' });
  } catch (error) {
    res.status(400).json({ success: false, message: `❌ Connection failed: ${error.message}` });
  }
};

module.exports = { login, logout, getMe, changePassword, updateProfile, registerHospitalPublic, testDbConnectionPublic };
