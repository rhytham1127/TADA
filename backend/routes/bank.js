const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get bank details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bank_details WHERE user_id = $1', [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bank details' });
  }
});

// Save/Update bank details
router.post('/', authenticateToken, async (req, res) => {
  const { account_holder_name, account_number, bank_name, branch_name, ifsc_code, account_type } = req.body;

  if (!account_holder_name || !account_number || !bank_name || !branch_name || !ifsc_code) {
    return res.status(400).json({ error: 'All bank fields are required' });
  }

  try {
    const existing = await db.query('SELECT id FROM bank_details WHERE user_id = $1', [req.user.id]);

    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        `UPDATE bank_details SET account_holder_name=$1, account_number=$2, bank_name=$3, 
         branch_name=$4, ifsc_code=$5, account_type=$6 WHERE user_id=$7 RETURNING *`,
        [account_holder_name, account_number, bank_name, branch_name, ifsc_code, account_type, req.user.id]
      );
    } else {
      result = await db.query(
        `INSERT INTO bank_details (user_id, account_holder_name, account_number, bank_name, branch_name, ifsc_code, account_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.id, account_holder_name, account_number, bank_name, branch_name, ifsc_code, account_type]
      );
    }

    res.json({ bankDetails: result.rows[0], message: 'Bank details saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
});

module.exports = router;
