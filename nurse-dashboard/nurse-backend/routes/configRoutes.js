const express = require('express');
const router = express.Router();

// @desc    Get hospital configuration
// @route   GET /api/config
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      hospitalName: process.env.HOSPITAL_NAME || 'CarePlus Hospital',
      opdTiming:    process.env.OPD_TIMING    || '09:00 AM - 06:00 PM',
      nodeEnv:      process.env.NODE_ENV      || 'development',
    },
  });
});

module.exports = router;
