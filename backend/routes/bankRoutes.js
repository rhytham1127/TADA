const express = require('express');
const router = express.Router();
const { saveBankDetails, getBankDetails } = require('../controllers/bankController');
const { authenticateToken } = require('../middleware/auth');

// All routes are protected
router.use(authenticateToken);

router.post('/', saveBankDetails);
router.get('/', getBankDetails);

module.exports = router;
