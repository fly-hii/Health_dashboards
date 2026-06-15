const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getPatientQueue,
  getEmergencyQueue,
  updateAppointmentStatus,
  getAppointmentDetails,
  getPatientProfile,
  addWalkInPatient,
  searchPatients,
  updatePatient,
} = require('../../controllers/nurse/nurseController');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/roleCheck');

router.use(protect);
router.use(authorize('nurse', 'admin'));

router.get('/dashboard', getDashboardStats);
router.get('/patient-queue', getPatientQueue);
router.get('/emergency-queue', getEmergencyQueue);
router.get('/patients/search', searchPatients);
router.get('/appointment/:id', getAppointmentDetails);
router.put('/appointment/:id/status', updateAppointmentStatus);
router.get('/patient/:id', getPatientProfile);
router.put('/patient/:id', updatePatient);
router.post('/walk-in', addWalkInPatient);

module.exports = router;
