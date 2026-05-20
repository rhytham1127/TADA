/**
 * superAdminOnly middleware
 * Applied to routes AFTER authenticateToken + adminAuth have already run.
 */
const superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Normalize role for comparison (handles "super_admin", "SuperAdmin", etc.)
  const role = (req.user.role || '').toLowerCase().replace(/_/g, '').trim();

  if (role !== 'superadmin') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
};

module.exports = { superAdminOnly };
