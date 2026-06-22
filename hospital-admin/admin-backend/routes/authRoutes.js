const express = require('express');
const router = express.Router();
const { login, logout, resetPassword } = require('../controllers/authController');
const { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore } = require('../controllers/forgotPasswordController');
const { sendOtpEmail } = require('../services/emailService');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/reset-password', protect, resetPassword);

// Login OTP: sends a real OTP email for sign-in
router.post('/login-otp/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { masterDb } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');
    const { sharedSaasDb } = require('../services/databaseResolver');

    // Look up user
    let user;
    const { User } = createModels(sharedSaasDb);
    user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      // Also check master super_admin_users
      try {
        const [rows] = await masterDb.query('SELECT id, name, email FROM super_admin_users WHERE email = ? LIMIT 1', { replacements: [email.toLowerCase()] });
        if (rows?.[0]) { user = { ...rows[0], role: 'SUPER_ADMIN' }; }
      } catch (_) {}
    }

    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email address.' });

    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    loginOtpStore.set(email.toLowerCase(), { otp, expiresAt });

    try {
      await sendOtpEmail(user.email || email, user.name || 'Admin', otp, 'Hospital Admin Portal', 'login');
    } catch (emailErr) {
      console.error('Login OTP email error:', emailErr.message);
    }

    res.json({ success: true, message: `OTP sent to your registered email` });
  } catch (err) {
    console.error('Login OTP send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// OTP-based forgot password (public endpoints)
router.post('/forgot-password/send-otp',   sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
router.post('/forgot-password/reset',      resetForgotPassword);

module.exports = router;
