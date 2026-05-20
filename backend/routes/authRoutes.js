const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { getDesignations } = require('../controllers/designationController');

router.post('/register', register);
router.post('/login', login);

router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);



// Designations (public - needed for register page)
router.get('/designations', getDesignations);

module.exports = router;
