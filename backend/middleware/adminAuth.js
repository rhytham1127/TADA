const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Normalize role for comparison (handles "Admin", "ADMIN", "super_admin", "SuperAdmin")
  const role = (req.user.role || '').toLowerCase().replace(/_/g, '').trim();

  // Admin + Super Admin can access admin routes
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

module.exports = { adminAuth };
