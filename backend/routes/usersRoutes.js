const express = require('express');
const router = express.Router();

const { getAllUsers, createUser, deleteUser, getUser } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { superAdminAuth } = require('../middleware/superAdminAuth');

// All user management routes require authentication and superadmin role
router.use(authenticateToken);
router.use(superAdminAuth);

// GET /api/admin/users - List all users
router.get('/', getAllUsers);

// GET /api/admin/users/:id - Get user by ID
router.get('/:id', getUser);

// POST /api/admin/users - Create new admin user
router.post('/', createUser);

// DELETE /api/admin/users/:id - Delete user
router.delete('/:id', deleteUser);

module.exports = router;

