const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getUsers)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN'), createUser);

router.route('/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN'), updateUser)
  .delete(authorize('HOSPITAL_ADMIN', 'ADMIN'), deleteUser);

module.exports = router;
