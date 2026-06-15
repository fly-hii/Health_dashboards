const express = require('express');
const router = express.Router();
const { login, logout, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/reset-password', protect, resetPassword);

module.exports = router;
