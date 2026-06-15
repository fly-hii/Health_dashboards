const express = require('express');
const router = express.Router();
const { 
  getPatients, 
  getPatientStats,
  getPatientById, 
  createPatient, 
  updatePatient, 
  deletePatient,
  getPatientHistory,
  getPatientAppointments,
  getPatientPrescriptions,
  getPatientReports,
  uploadPatientReport,
  deletePatientReport
} = require('../controllers/patientController');
const { upload } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Stats route (must be before /:id)
router.route('/stats')
  .get(getPatientStats);

router.route('/')
  .get(getPatients)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN', 'RECEPTIONIST'), createPatient);

router.route('/:id')
  .get(getPatientById)
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN', 'RECEPTIONIST'), updatePatient)
  .delete(authorize('HOSPITAL_ADMIN', 'ADMIN'), deletePatient);

// Sub-resource routes
router.route('/:id/history')
  .get(getPatientHistory);

router.route('/:id/appointments')
  .get(getPatientAppointments);

router.route('/:id/prescriptions')
  .get(getPatientPrescriptions);

router.route('/:id/reports')
  .get(getPatientReports)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'), upload.single('file'), uploadPatientReport);

router.route('/:id/reports/:reportId')
  .delete(authorize('HOSPITAL_ADMIN', 'ADMIN', 'DOCTOR', 'LAB_TECHNICIAN'), deletePatientReport);

module.exports = router;
