const express = require('express');
const router = express.Router();
const { getOrders, updateOrderStatus, getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/pharmacyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Orders Routes
router.route('/orders')
  .get(getOrders);
router.route('/orders/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN', 'PHARMACIST'), updateOrderStatus);

// Inventory Routes
router.route('/inventory')
  .get(getInventory)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN', 'PHARMACIST'), addInventoryItem);
router.route('/inventory/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN', 'PHARMACIST'), updateInventoryItem)
  .delete(authorize('HOSPITAL_ADMIN', 'ADMIN', 'PHARMACIST'), deleteInventoryItem);

module.exports = router;
