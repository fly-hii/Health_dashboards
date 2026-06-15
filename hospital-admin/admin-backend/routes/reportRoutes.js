const express = require('express');
const router = express.Router();
const { getReportsList, generateReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getReportsList)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN'), generateReport);

module.exports = router;
