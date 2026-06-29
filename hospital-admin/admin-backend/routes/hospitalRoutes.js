'use strict';

const express = require('express');
const router = express.Router();
const {
  getHospitalProfile,
  updateHospitalProfile,
  getHospitalSettings,
  updateHospitalSettings,
  getHospitalSubscription,
  upgradeHospitalSubscription
} = require('../controllers/hospitalController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/profile')
  .get(getHospitalProfile)
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN'), updateHospitalProfile);

router.route('/settings')
  .get(getHospitalSettings)
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN'), updateHospitalSettings);

router.route('/subscription')
  .get(getHospitalSubscription)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN'), upgradeHospitalSubscription);

module.exports = router;
