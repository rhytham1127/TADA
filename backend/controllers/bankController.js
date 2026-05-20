const db = require('../db');
const { validateBankDetails } = require('../utils/validators');
require('dotenv').config();

// Save or update bank details
const saveBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_holder_name, bank_name, account_number, ifsc_code, branch_name } = req.body;

    // Validate
    if (!account_holder_name || !bank_name || !account_number || !ifsc_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if bank details already exist
    const existingResult = await db.query(
      'SELECT * FROM bank_details WHERE user_id = $1',
      [userId]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing
      result = await db.query(
        `UPDATE bank_details 
         SET account_holder_name = $1, bank_name = $2, account_number = $3, ifsc_code = $4, branch_name = $5
         WHERE user_id = $6
         RETURNING *`,
        [account_holder_name, bank_name, account_number, ifsc_code, branch_name || null, userId]
      );
    } else {
      // Insert new
      result = await db.query(
        `INSERT INTO bank_details (user_id, account_holder_name, bank_name, account_number, ifsc_code, branch_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, account_holder_name, bank_name, account_number, ifsc_code, branch_name || null]
      );
    }

    res.json({
      message: 'Bank details saved successfully',
      bankDetails: result.rows[0]
    });
  } catch (error) {
    console.error('Save bank details error:', error);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
};

// Get bank details
const getBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT * FROM bank_details WHERE user_id = $1',
      [userId]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({ error: 'Failed to get bank details' });
  }
};

module.exports = { saveBankDetails, getBankDetails };
