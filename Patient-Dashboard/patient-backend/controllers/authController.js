const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Patient, Hospital, AuditLog } = require('../models');

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

    const existing = await models.Patient.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Generate patient ID
    const today = new Date();
    const prefix = `PAT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const last = await models.Patient.findOne({
      where: { patient_id: { [Op.like]: `${prefix}%` } },
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

    res.status(201).json({ success: true, token, user: patientData });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, mobileNumber } = req.body;
  const hospitalCode = req.body.hospitalCode || req.headers['x-hospital-code'] || process.env.HOSPITAL_CODE;

  try {
    if ((!email && !mobileNumber) || !password)
      return res.status(400).json({ success: false, message: 'Email or Mobile Number and password required' });

    const lookup = mobileNumber ? { phone: mobileNumber } : { email };

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let resolvedHospitalId;
    let db, models;
    let patient;

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

      // Step 2: Resolve tenant DB
      db = await getHospitalConnection(resolvedHospitalId);
      models = createModels(db);
      patient = await models.Patient.findOne({ where: lookup });
    } else {
      // Fallback: look up in shared database
      patient = await Patient.findOne({ where: lookup });
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

    if (!patient)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (patient.status === 'Inactive')
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await patient.update({ last_login: new Date() });

    const token = generateToken(patient);
    const { password: _, ...patientData } = patient.toJSON();

    res.json({ success: true, token, user: patientData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { mobileNumber, email } = req.body;
    const target = email || mobileNumber;
    if (!target) {
      return res.status(400).json({ success: false, message: 'Mobile number or Email is required' });
    }
    // Simple mock success for demonstration
    res.json({ success: true, message: 'OTP sent successfully to ' + target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const { password: _, ...patientData } = req.user.toJSON();
    res.json({ success: true, user: patientData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const { password, email, hospital_id, patient_id, ...updates } = req.body;
    await req.user.update(updates);
    const { password: _, ...patientData } = req.user.toJSON();
    res.json({ success: true, user: patientData, message: 'Profile updated successfully' });
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

    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    const lookup = email ? { email } : { phone: mobileNumber };

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let resolvedHospitalId;
    let db, models;
    let patient;

    // Fallback: look up in shared database
    patient = await Patient.findOne({ where: lookup });
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
      patient = await models.Patient.findOne({ where: lookup });
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient account found matching these details' });
    }

    if (patient.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    await patient.update({ last_login: new Date() });

    const token = generateToken(patient);
    const { password: _, ...patientData } = patient.toJSON();

    res.json({ success: true, token, user: patientData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword, sendOtp, verifyOtp };
