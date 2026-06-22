'use strict';
/**
 * authMiddleware.js (Doctor Backend)
 * JWT → hospitalId → resolve tenant DB → attach req.db + req.models + req.user
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
    if (!['DOCTOR', 'HOSPITAL_ADMIN'].includes(decoded.role))
      return res.status(403).json({ success: false, message: 'Not authorized for this portal' });

    const hospitalId = decoded.hospitalId;
    if (!hospitalId)
      return res.status(401).json({ success: false, message: 'Token missing hospitalId' });

    const db     = await getHospitalConnection(hospitalId);
    const models = createModels(db);
    const user   = await models.User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

    if (!user)     return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account deactivated' });

    // Auto-update availability_status to Available and last_login (acting as last active) to current time.
    // Throttle database writes to at most once every 5 minutes to keep it performant.
    const now = new Date();
    const lastActive = user.last_login ? new Date(user.last_login) : null;
    const shouldUpdateAvailability = user.availability_status !== 'Available' && user.availability_status !== 'On Leave';
    const shouldUpdateTimestamp = !lastActive || (now - lastActive > 5 * 60 * 1000);

    if (shouldUpdateAvailability || shouldUpdateTimestamp) {
      const updates = {};
      if (shouldUpdateAvailability) {
        updates.availability_status = 'Available';
        user.availability_status = 'Available';
      }
      if (shouldUpdateTimestamp) {
        updates.last_login = now;
        user.last_login = now;
      }
      await user.update(updates).catch(err => console.error('[protect middleware auto-update error]', err));
    }

    req.user = user; req.hospitalId = parseInt(hospitalId); req.db = db; req.models = models;
    next();
  } catch (err) {
    if (err.message === 'Hospital account is suspended') {
      return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: `Role "${req.user?.role}" not authorized` });
  next();
};

const authorizeDoctor = (req, res, next) => {
  if (!req.user || !['DOCTOR', 'HOSPITAL_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized, doctor role required' });
  }
  next();
};

const tenantMiddleware = (req, res, next) => {
  if (!req.hospitalId) {
    return res.status(400).json({ success: false, message: 'Hospital tenant context missing' });
  }
  next();
};

module.exports = { protect, authorize, authorizeDoctor, tenantMiddleware };
