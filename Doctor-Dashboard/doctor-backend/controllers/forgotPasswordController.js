'use strict';
/**
 * forgotPasswordController.js – Doctor Backend
 * 
 * 3 public endpoints:
 *   POST /api/auth/forgot-password/send-otp    → validates email, generates OTP, sends email
 *   POST /api/auth/forgot-password/verify-otp  → validates OTP code
 *   POST /api/auth/forgot-password/reset       → updates password after OTP verified
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/emailService');

// In-memory OTP store: email → { otp, expiresAt, verified, userId }
// For production, replace with Redis.
const otpStore = new Map();

// Separate login OTP store
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

    // Look up user in the tenant-aware shared DB (same pattern as login)
    const { sharedSaasDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');
    const models = createModels(sharedSaasDb);
    const { User } = models;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address. Please contact your hospital admin.' });
    }

    // Only allow DOCTOR role
    if (!['DOCTOR'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'This email is not registered as a Doctor in this portal.' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact your hospital admin.' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), { otp, expiresAt, verified: false, userId: user.id, hospitalId: user.hospital_id });

    try {
      await sendOtpEmail(user.email, user.name || 'Doctor', otp, 'Doctor Portal');
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
    console.error('Doctor send OTP error:', error);
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
    if (record.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    record.verified = true;
    record.verifiedAt = Date.now();
    otpStore.set(email.toLowerCase(), record);

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Doctor verify OTP error:', error);
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

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const { sharedSaasDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');
    const models = createModels(sharedSaasDb);
    const { User } = models;

    const user = await User.findOne({ where: { id: record.userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    await user.update({ password: await bcrypt.hash(newPassword, salt) });

    otpStore.delete(email.toLowerCase());

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Doctor reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore };

