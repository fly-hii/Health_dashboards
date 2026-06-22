const express = require('express');
const router = express.Router();
const {
  recordVitals,
  updateVitals,
  getVitalsByAppointment,
  getVitalsByPatient,
} = require('../../controllers/nurse/vitalsController');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/roleCheck');

router.use(protect);

router.post('/', authorize('nurse', 'admin', 'hospital_admin'), recordVitals);
router.put('/:id', authorize('nurse', 'admin', 'hospital_admin'), updateVitals);
router.get('/appointment/:appointmentId', getVitalsByAppointment);
router.get('/patient/:patientId', getVitalsByPatient);

module.exports = router;
