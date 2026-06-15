const express = require('express');
const router = express.Router();
const { getAppointments, createAppointment, updateAppointment, deleteAppointment } = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAppointments)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN', 'RECEPTIONIST'), createAppointment);

router.route('/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN', 'RECEPTIONIST'), updateAppointment)
  .delete(authorize('HOSPITAL_ADMIN', 'ADMIN'), deleteAppointment);

module.exports = router;
