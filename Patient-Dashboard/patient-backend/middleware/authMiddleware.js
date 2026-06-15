'use strict';
/**
 * authMiddleware.js (Patient Backend)
 * JWT → hospitalId → resolve tenant DB → attach req.db + req.models + req.user
 * NOTE: Patients are stored in the `patients` table, NOT `users` table.
 */
const jwt    = require('jsonwebtoken');
const { getHospitalConnection } = require('../services/databaseResolver');
const { createModels }          = require('../services/modelFactory');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  try {
    const decoded    = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const hospitalId = decoded.hospitalId;
    if (!hospitalId)
      return res.status(401).json({ success: false, message: 'Token missing hospitalId' });

    const db     = await getHospitalConnection(hospitalId);
    const models = createModels(db);

    // Patients are in the `patients` table — NOT the `users` table
    const user = await models.Patient.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

    if (!user) return res.status(401).json({ success: false, message: 'Patient not found' });

    // Accept both 'Active' and 'active' statuses
    const statusLower = (user.status || '').toLowerCase();
    if (statusLower === 'inactive' || statusLower === 'blocked')
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    req.user = user; req.hospitalId = parseInt(hospitalId); req.db = db; req.models = models;
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error:', err.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: `Role "${req.user?.role}" not authorized` });
  next();
};

module.exports = { protect, authorize };
