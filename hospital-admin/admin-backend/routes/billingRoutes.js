const express = require('express');
const router = express.Router();
const { getInvoices, createInvoice, updateInvoiceStatus } = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/invoices')
  .get(getInvoices)
  .post(authorize('HOSPITAL_ADMIN', 'ADMIN', 'RECEPTIONIST'), createInvoice);

router.route('/invoices/:id')
  .put(authorize('HOSPITAL_ADMIN', 'ADMIN', 'RECEPTIONIST'), updateInvoiceStatus);

module.exports = router;
