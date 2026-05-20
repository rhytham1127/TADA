const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

const requireRoles = (...allowedRoles) => {
  return [requireAuth, (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (!role) {
      return res.status(403).json({ error: 'Role not found' });
    }

    // Normalize allowedRoles too
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().trim());
    if (!normalizedAllowed.includes(role)) {
      return res.status(403).json({ error: `Forbidden: requires ${allowedRoles.join(', ')}` });
    }

    next();
  }];
};

module.exports = { requireAuth, requireRoles };
