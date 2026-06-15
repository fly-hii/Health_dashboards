const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    // Normalize role to lowercase so that admin-portal roles (e.g. 'NURSE')
    // match against the expected lowercase role names (e.g. 'nurse')
    const userRole = (req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { authorize };
