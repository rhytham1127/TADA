const express = require('express');
const router = express.Router();
const {
  createTADAClaim,
  getTADAClaims,
  getTADAClaim,
  updateTADAClaim,
  deleteTADAClaim,
  addExpense
} = require('../controllers/tadaController');
const { authenticateToken } = require('../middleware/auth');

// All routes are protected
router.use(authenticateToken);

// TADA Claim routes
router.post('/', createTADAClaim);
router.get('/', getTADAClaims);
router.get('/:id', getTADAClaim);
router.put('/:id', updateTADAClaim);
router.delete('/:id', deleteTADAClaim);

// Expense routes
router.post('/:claimId/expenses', addExpense);

module.exports = router;
