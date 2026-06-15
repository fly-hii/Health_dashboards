const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAppointments,
  getDoctorPatients,
  getDoctorPrescriptions,
  getDoctorReports,
  createDoctorPrescription,
  assignDoctorPatient,
  sendDoctorNotification,
  getDoctorStats
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public/authenticated read routes
router.get('/', protect, getDoctors);
router.get('/stats', protect, getDoctorStats);
router.get('/:id', protect, getDoctorById);
router.get('/:id/appointments', protect, getDoctorAppointments);
router.get('/:id/patients', protect, getDoctorPatients);
router.get('/:id/prescriptions', protect, getDoctorPrescriptions);
router.get('/:id/reports', protect, getDoctorReports);

// Mutating routes restricted to Admin / Super Admin roles
router.post('/', protect, authorize('HOSPITAL_ADMIN', 'ADMIN'), createDoctor);
router.put('/:id', protect, authorize('HOSPITAL_ADMIN', 'ADMIN'), updateDoctor);
router.delete('/:id', protect, authorize('HOSPITAL_ADMIN', 'ADMIN'), deleteDoctor);

// Quick action routes
router.post('/:id/prescriptions', protect, authorize('HOSPITAL_ADMIN', 'ADMIN'), createDoctorPrescription);
router.post('/:id/patients', protect, authorize('HOSPITAL_ADMIN', 'ADMIN'), assignDoctorPatient);
router.post('/:id/notifications', protect, authorize('HOSPITAL_ADMIN', 'ADMIN'), sendDoctorNotification);

module.exports = router;
