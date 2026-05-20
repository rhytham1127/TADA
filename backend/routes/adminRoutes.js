const express = require('express');
const router = express.Router();
const {
  getAllClaims, getClaimAdmin, approveClaim, rejectClaim, revertClaim, getAdminStats
} = require('../controllers/adminController');
const { getAllUsers, createUser, updateUser, deleteUser, getUser } = require('../controllers/userController');
const { getAuditLogs } = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { superAdminOnly } = require('../middleware/superAdminOverrideAuth');
const { superAdminAuth } = require('../middleware/superAdminAuth');

router.use(authenticateToken);
router.use(adminAuth);

// Dashboard stats
router.get('/stats', getAdminStats);

// Claims management
router.get('/claims', getAllClaims);
router.get('/claims/:id', getClaimAdmin);
router.put('/claims/:id/approve', approveClaim);
router.put('/claims/:id/reject', rejectClaim);
router.put('/claims/:id/revert', superAdminOnly, revertClaim);

// Audit logs (admin + superadmin)
router.get('/audit-logs', getAuditLogs);

// User management (Super Admin only)
const userRoutes = express.Router();
userRoutes.use(superAdminAuth);
userRoutes.get('/', getAllUsers);
userRoutes.get('/:id', getUser);
userRoutes.post('/', createUser);
userRoutes.put('/:id', updateUser);
userRoutes.delete('/:id', deleteUser);

router.use('/users', userRoutes);

module.exports = router;
