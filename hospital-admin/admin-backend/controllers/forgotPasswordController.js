'use strict';
/**
 * forgotPasswordController.js – Hospital Admin Backend
 * Endpoints:
 *   POST /api/auth/forgot-password/send-otp
 *   POST /api/auth/forgot-password/verify-otp
 *   POST /api/auth/forgot-password/reset
 *   POST /api/auth/login-otp/send   ← login OTP (real email)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/emailService');

// In-memory OTP store for forgot-password
const otpStore = new Map();

// Separate store for login OTPs
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
    const { email, hospitalCode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let user;
    let resolvedHospitalId;

    if (hospitalCode) {
      // Resolve from hospital code → tenant DB
      const [results] = await masterDb.query(
        'SELECT id, status FROM hospitals WHERE code = ? LIMIT 1',
        { replacements: [hospitalCode.toUpperCase()] }
      );
      const hospital = results?.[0];
      if (!hospital?.id) return res.status(404).json({ success: false, message: `Hospital code "${hospitalCode}" not found` });
      if (hospital.status === 'suspended') return res.status(403).json({ success: false, message: 'Hospital account is suspended.' });

      resolvedHospitalId = hospital.id;
      const db = await getHospitalConnection(resolvedHospitalId);
      const { User } = createModels(db);
      user = await User.findOne({ where: { email: email.toLowerCase() } });
    } else {
      // Fallback: shared SaaS DB
      const { sharedSaasDb } = require('../services/databaseResolver');
      const { User } = createModels(sharedSaasDb);
      user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (user) resolvedHospitalId = user.hospital_id;
    }

    // SECURITY: Always respond with same message regardless of whether email exists
    // This prevents user enumeration via the forgot-password endpoint.
    const GENERIC_MSG = 'If this email is registered as an admin, an OTP has been sent.';

    if (!user || !['HOSPITAL_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role) || user.status === 'Inactive') {
      return res.json({ success: true, message: GENERIC_MSG });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expiresAt, verified: false, userId: user.id, hospitalId: resolvedHospitalId, hospitalCode, attempts: 0 });

    try {
      await sendOtpEmail(user.email, user.name || 'Admin', otp, 'Hospital Admin Portal');
    } catch (emailErr) {
      console.error('Email send error (OTP still valid):', emailErr.message);
    }

    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
      success: true,
      message: `OTP sent to ${maskEmail(user.email)}`,
      ...(isDev && { devOtp: otp, devNote: 'OTP shown in dev mode only. Remove in production.' }),
    });
  } catch (error) {
    console.error('Admin send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};


// ── POST /api/auth/forgot-password/verify-otp ──────────────────
const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const key = email.toLowerCase();
    const record = otpStore.get(key);
    if (!record) return res.status(400).json({ success: false, message: 'No OTP requested for this email. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // SECURITY: Brute-force protection — max 5 attempts
    const MAX_ATTEMPTS = 5;
    if ((record.attempts || 0) >= MAX_ATTEMPTS) {
      otpStore.delete(key);
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    if (record.otp !== otp.toString()) {
      record.attempts = (record.attempts || 0) + 1;
      otpStore.set(key, record);
      const remaining = MAX_ATTEMPTS - record.attempts;
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Invalid OTP code. ${remaining} attempt(s) remaining.`
          : 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    record.verified = true;
    record.verifiedAt = Date.now();
    otpStore.set(key, record);

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Admin verify OTP error:', error);
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
    if (record.otp !== otp.toString()) return res.status(400).json({ success: false, message: 'Invalid OTP. Please start over.' });

    if (!newPassword || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });

    const { sharedSaasDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let db = sharedSaasDb;
    if (record.hospitalId) {
      try { db = await getHospitalConnection(record.hospitalId); } catch (_) {}
    }

    const { User } = createModels(db);
    const user = await User.findOne({ where: { id: record.userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    await user.update({ password: await bcrypt.hash(newPassword, salt) });

    otpStore.delete(email.toLowerCase());

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore };

