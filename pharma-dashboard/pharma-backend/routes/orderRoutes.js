const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderMedicines,
  getDashboardStats,
  getDailyTrend
} = require('../controllers/orderController');

router.route('/').get(getOrders);
router.route('/stats/dashboard').get(getDashboardStats);
router.route('/stats/daily-trend').get(getDailyTrend);
router.route('/:id').get(getOrderById);
router.route('/:id/status').put(updateOrderStatus);
router.route('/:id/medicines').put(updateOrderMedicines);

module.exports = router;
