'use strict';

const express  = require('express');
const router   = express.Router();
const { protect, isSuperAdmin } = require('../middleware/authMiddleware');

const {
  createHospital, listHospitals, getHospital,
  suspendHospital, activateHospital, updatePlan, deleteHospital,
  getAnalytics, getAuditLogs,
} = require('../controllers/superAdminController');

const {
  getDbConfig, upsertDbConfig, testDbConnection,
  toggleDbConnection, listDbConnections, deleteDbConfig,
} = require('../controllers/dbConnectionController');

// All routes require Super Admin JWT
router.use(protect, isSuperAdmin);

// ── Hospital Management ────────────────────────────────────────
router.post  ('/hospitals',                    createHospital);
router.get   ('/hospitals',                    listHospitals);
router.get   ('/hospitals/:id',                getHospital);
router.patch ('/hospitals/:id/suspend',        suspendHospital);
router.patch ('/hospitals/:id/activate',       activateHospital);
router.put   ('/hospitals/:id/plan',           updatePlan);
router.delete('/hospitals/:id',                deleteHospital);

// ── External DB Connection Management ─────────────────────────
router.get   ('/db-connections',               listDbConnections);
router.get   ('/hospitals/:id/db-config',      getDbConfig);
router.put   ('/hospitals/:id/db-config',      upsertDbConfig);
router.post  ('/hospitals/:id/test-db',        testDbConnection);
router.patch ('/hospitals/:id/db-config/toggle', toggleDbConnection);
router.delete('/hospitals/:id/db-config',       deleteDbConfig);

// ── Analytics & Audit ─────────────────────────────────────────
router.get   ('/analytics',                    getAnalytics);
router.get   ('/audit-logs',                   getAuditLogs);

module.exports = router;
