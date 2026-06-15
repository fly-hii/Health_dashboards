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

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      full_name, email, password, phone, dob, gender,
      blood_group, address, hospital_id,
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existing = await Patient.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Generate patient ID
    const today = new Date();
    const prefix = `PAT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const last = await Patient.findOne({
      where: { patient_id: { [Op.like]: `${prefix}%` } },
      order: [['patient_id', 'DESC']],
    });
    const seq = last?.patient_id ? parseInt(last.patient_id.replace(prefix, '')) + 1 : 1;
    const patient_id = `${prefix}${String(seq).padStart(3, '0')}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine hospital - use first active hospital if not specified
    let resolvedHospitalId = hospital_id;
    if (!resolvedHospitalId) {
      try {
        const defaultHospital = await Hospital.findOne({ where: { status: 'active' } });
        resolvedHospitalId = defaultHospital?.id || 1;
      } catch (_) {
        resolvedHospitalId = 1;
      }
    }

    const patient = await Patient.create({
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
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const patient = await Patient.findOne({ where: { email } });
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

module.exports = { register, login, getProfile, updateProfile, changePassword };
