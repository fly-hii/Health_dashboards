'use strict';

const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getDepartments)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN'), createDepartment);

router.route('/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN'), updateDepartment)
  .delete(authorize('HOSPITAL_ADMIN', 'ADMIN'), deleteDepartment);

module.exports = router;
