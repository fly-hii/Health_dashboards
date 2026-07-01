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

  const token = auth.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }

  try {
    if (!['NURSE', 'HOSPITAL_ADMIN'].includes(decoded.role))
      return res.status(403).json({ success: false, message: 'Not authorized for this portal' });

    const hospitalId = decoded.hospitalId;
    if (!hospitalId)
      return res.status(401).json({ success: false, message: 'Token missing hospitalId' });

    const db     = await getHospitalConnection(hospitalId);
    const models = createModels(db);
    const user   = await models.User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

    if (!user)     return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account deactivated' });

    req.user = user; req.hospitalId = parseInt(hospitalId); req.db = db; req.models = models;
    next();
  } catch (err) {
    console.error('Database/System Auth error:', err.message);
    if (err.message === 'Hospital account is suspended') {
      return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error resolving database or loading user context' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: `Role "${req.user?.role}" not authorized` });
  next();
};

module.exports = { protect, authorize };
