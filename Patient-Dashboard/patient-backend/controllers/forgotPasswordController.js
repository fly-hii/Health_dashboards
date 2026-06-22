'use strict';
/**
 * forgotPasswordController.js – Patient Backend
 * Patients are stored in the `patients` table (not `users`).
 *
 * Endpoints:
 *   POST /api/auth/forgot-password/send-otp
 *   POST /api/auth/forgot-password/verify-otp
 *   POST /api/auth/forgot-password/reset
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/emailService');

// In-memory OTP store. Replace with Redis in production.
const otpStore = new Map();
const loginOtpStore = new Map();


const generateOtp = () => crypto.randomInt(100000, 999999).toString();
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const masked = local.length <= 2 ? local : local[0] + '***' + local.slice(-1);
  return `${masked}@${domain}`;
};

// ── POST /api/auth/forgot-password/send-otp ────────────────────
const sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    // Patient lookup: check shared DB first, then tenant DBs
    let patient;
    let resolvedHospitalId;

    // Shared SaaS DB fallback
    const { sharedSaasDb } = require('../services/databaseResolver');
    const sharedModels = createModels(sharedSaasDb);
    patient = await sharedModels.Patient.findOne({ where: { email: email.toLowerCase() } });

    if (!patient) {
      // Search across all active tenant DBs
      try {
        const [connections] = await masterDb.query('SELECT * FROM db_connections WHERE is_active = 1');
        for (const conn of connections) {
          try {
            const db = await getHospitalConnection(conn.hospital_id);
            const tenantModels = createModels(db);
            const found = await tenantModels.Patient.findOne({ where: { email: email.toLowerCase() } });
            if (found) { patient = found; resolvedHospitalId = conn.hospital_id; break; }
          } catch (_) {}
        }
      } catch (_) {}
    } else {
      resolvedHospitalId = patient.hospital_id;
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient account found with this email address.' });
    }

    if (patient.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact your hospital.' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expiresAt, verified: false, patientId: patient.id, hospitalId: resolvedHospitalId });

    await sendOtpEmail(patient.email, patient.full_name || 'Patient', otp, 'Patient Portal');

    res.json({ success: true, message: `OTP sent to ${maskEmail(patient.email)}` });
  } catch (error) {
    console.error('Patient send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// ── POST /api/auth/forgot-password/verify-otp ──────────────────
const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const record = otpStore.get(email.toLowerCase());
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested for this email. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp.toString()) return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });

    record.verified = true;
    record.verifiedAt = Date.now();
    otpStore.set(email.toLowerCase(), record);

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Patient verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/forgot-password/reset ───────────────────────
const resetForgotPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });

    const record = otpStore.get(email.toLowerCase());
    if (!record || !record.verified) return res.status(400).json({ success: false, message: 'OTP not verified. Please complete OTP verification first.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP session expired. Please start over.' });
    }
    if (record.otp !== otp.toString()) return res.status(400).json({ success: false, message: 'Invalid OTP.' });

    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });

    const { sharedSaasDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let db = sharedSaasDb;
    if (record.hospitalId) {
      try { db = await getHospitalConnection(record.hospitalId); } catch (_) {}
    }

    const { Patient } = createModels(db);
    const patient = await Patient.findOne({ where: { id: record.patientId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient account not found' });

    const salt = await bcrypt.genSalt(10);
    await patient.update({ password: await bcrypt.hash(newPassword, salt) });

    otpStore.delete(email.toLowerCase());

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Patient reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore };
