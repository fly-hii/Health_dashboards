// tenantMiddleware.js
// Ensures every request has a valid hospitalId, enforcing data isolation.
// Must run AFTER authMiddleware (protect).

const tenantMiddleware = (req, res, next) => {
  const hospitalId = req.hospitalId || req.user?.hospital_id;

  if (!hospitalId) {
    // Super admins bypass tenant check
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Tenant context missing. No hospital assigned to this user.',
    });
  }

  req.hospitalId = parseInt(hospitalId);
  next();
};

module.exports = tenantMiddleware;
