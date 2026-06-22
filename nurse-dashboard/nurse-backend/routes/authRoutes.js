const express = require('express');
const router = express.Router();
const { login, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore } = require('../controllers/forgotPasswordController');
const { sendOtpEmail } = require('../services/emailService');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Login OTP: sends a real OTP email for sign-in
router.post('/login-otp/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { User } = require('../models');
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email address.' });

    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    loginOtpStore.set(email.toLowerCase(), { otp, expiresAt });

    try {
      await sendOtpEmail(user.email, user.name || 'Nurse', otp, 'Nurse Portal', 'login');
    } catch (emailErr) {
      console.error('Login OTP email error:', emailErr.message);
    }

    res.json({ success: true, message: 'OTP sent to your registered email' });
  } catch (err) {
    console.error('Nurse login OTP send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// OTP-based forgot password
router.post('/forgot-password/send-otp',   sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
router.post('/forgot-password/reset',      resetForgotPassword);

module.exports = router;
