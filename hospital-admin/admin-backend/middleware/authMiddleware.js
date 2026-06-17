'use strict';
/**
 * authMiddleware.js (Hospital Admin Backend)
 *
 * protect: Validates JWT, then resolves the hospital DB and attaches req.models.
 *
 * Login flow for hospital staff:
 *   POST /api/auth/login  { email, password, hospitalCode }
 *   → authController resolves hospitalId from hospitalCode via careplus_master
 *   → issues JWT: { id, hospitalId, role }
 *   → subsequent requests: protect() reads hospitalId from JWT and resolves DB
 */

const jwt = require('jsonwebtoken');
const { getHospitalConnection } = require('../services/databaseResolver');
const { createModels }          = require('../services/modelFactory');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const token   = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'ADMIN'].includes(decoded.role))
      return res.status(403).json({ success: false, message: 'Not authorized for this portal' });

    const hospitalId = decoded.hospitalId;
    if (!hospitalId)
      return res.status(401).json({ success: false, message: 'Token missing hospitalId' });

    // Resolve tenant DB
    const db     = await getHospitalConnection(hospitalId);
    const models = createModels(db);

    // Load user from tenant DB
    const user = await models.User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user)
      return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status === 'Inactive')
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    req.user       = user;
    req.hospitalId = parseInt(hospitalId);
    req.db         = db;
    req.models     = models;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    if (err.message === 'Hospital account is suspended') {
      return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({
      success: false,
      message: `Role "${req.user?.role}" is not authorized for this resource`,
    });
  next();
};

module.exports = { protect, authorize };
