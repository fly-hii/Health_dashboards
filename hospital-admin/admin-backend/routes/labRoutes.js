const express = require('express');
const router = express.Router();
const { getTests, updateTest, getTechnicians, addLabTest } = require('../controllers/labController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/tests')
  .get(getTests)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN', 'DOCTOR', 'LAB_TECHNICIAN'), addLabTest);

router.route('/tests/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN', 'LAB_TECHNICIAN'), updateTest);

router.route('/technicians')
  .get(getTechnicians);

module.exports = router;
