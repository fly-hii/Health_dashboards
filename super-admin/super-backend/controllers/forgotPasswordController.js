'use strict';
/**
 * forgotPasswordController.js – Super Admin Backend
 * Super admins are stored in `super_admin_users` table in the masterDb.
 *
 * Endpoints:
 *   POST /api/auth/forgot-password/send-otp
 *   POST /api/auth/forgot-password/verify-otp
 *   POST /api/auth/forgot-password/reset
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../services/emailService');
const { masterDb } = require('../config/masterDatabase');

// In-memory OTP store for forgot-password. Replace with Redis in production.
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

    const [rows] = await masterDb.query(
      'SELECT id, name, email, is_active FROM super_admin_users WHERE email = ? LIMIT 1',
      { replacements: [email.toLowerCase()] }
    );

    const admin = rows?.[0];

    if (!admin) {
      return res.status(404).json({ success: false, message: 'No Super Admin account found with this email address.' });
    }

    if (admin.is_active === 0 || admin.is_active === false) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact system administrator.' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expiresAt, verified: false, adminId: admin.id });

    await sendOtpEmail(admin.email, admin.name || 'Super Admin', otp, 'Super Admin Portal');

    res.json({ success: true, message: `OTP sent to ${maskEmail(admin.email)}` });
  } catch (error) {
    console.error('Super Admin send OTP error:', error);
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
    console.error('Super Admin verify OTP error:', error);
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

    if (!newPassword || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });

    const salt = await bcrypt.genSalt(12); // Higher rounds for super admin
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await masterDb.query(
      'UPDATE super_admin_users SET password = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [hashedPassword, record.adminId] }
    );

    otpStore.delete(email.toLowerCase());

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Super Admin reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore };

