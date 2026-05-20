/**
 * Super Admin Auth Middleware
 * Restricts access to users with role === 'superadmin'
 */
const superAdminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  // Normalize role for comparison (handles "super_admin", "SuperAdmin", etc.)
  const role = (req.user.role || '').toLowerCase().replace(/_/g, '').trim();

  if (role !== 'superadmin') {
    return res.status(403).json({ success: false, error: 'Super Admin access required' });
  }

  next();
};

module.exports = { superAdminAuth };
