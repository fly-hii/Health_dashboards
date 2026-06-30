// tenantMiddleware.js
// Ensures every request has a valid hospitalId, enforcing data isolation.
// Must run AFTER authMiddleware (protect).

const tenantMiddleware = (req, res, next) => {
  const hospitalId = req.hospitalId || req.user?.hospital_id;

  // SUPER_ADMIN tokens are not valid in the Hospital Admin portal
  // They must use the Super Admin backend (port 5000)
  if (req.user?.role === 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Super Admin accounts must use the Super Admin portal.',
    });
  }

  if (!hospitalId) {
    return res.status(403).json({
      success: false,
      message: 'Tenant context missing. No hospital assigned to this user.',
    });
  }

  req.hospitalId = parseInt(hospitalId);
  next();
};

module.exports = tenantMiddleware;
