/**
 * tenantDatabase.js
 *
 * Drop-in replacement for tenantMiddleware.js
 *
 * Sets on req:
 *   req.hospitalId  — validated integer hospital ID
 *   req.db          — Sequelize instance for this hospital
 *   req.models      — all 17 HMS models bound to req.db
 *
 * Must run AFTER authMiddleware (which sets req.user + req.hospitalId).
 */

'use strict';

const { getHospitalConnection } = require('../services/databaseResolver');
const { createModels }          = require('../services/modelFactory');

const tenantDatabase = async (req, res, next) => {
  // Super admins (calling master-level routes) bypass tenant DB resolution
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const hospitalId = req.hospitalId || req.user?.hospital_id;

  if (!hospitalId) {
    return res.status(403).json({
      success: false,
      message: 'Tenant context missing — no hospital assigned to this user.',
    });
  }

  try {
    const db = await getHospitalConnection(parseInt(hospitalId));
    const models = createModels(db);

    req.db       = db;
    req.models   = models;
    req.hospitalId = parseInt(hospitalId);

    next();
  } catch (err) {
    console.error(`[tenantDatabase] Failed to resolve DB for hospital ${hospitalId}:`, err.message);
    if (err.message === 'Hospital account is suspended') {
      return res.status(403).json({
        success: false,
        message: 'Hospital account is suspended. Contact CarePlus support.',
      });
    }
    return res.status(503).json({
      success: false,
      message: 'Database connection failed for this hospital.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

module.exports = tenantDatabase;
