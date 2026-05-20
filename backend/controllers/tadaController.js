const db = require('../db');
const { logAudit } = require('../utils/auditLogger');
const { DEFAULT_STATUS } = require('../constants/claimStatus');
require('dotenv').config();

// Designation-based DA mapping (BISAG-N) used for server-side enforcement
const normalize = (v) => (v || '').toLowerCase().trim();

const DESIGNATION_TO_DA_RATE = (() => {
  const map = new Map();
  const put = (rate, list) => {
    for (const item of list) map.set(normalize(item), parseInt(rate, 10));
  };

  put(800, [
    'project analyst',
    'software developer',
    'junior software developer',
    'senior software developer',
    'ui/ux designer',
    'data analyst',
    'junior developer',
    'senior developer'
  ]);
  put(900, ['project manager']);
  put(1000, ['dg', 'sdg', 'director general', 'director']);

  return map;
})();

const getDAForDesignationServer = (designation) => {
  const d = normalize(designation);
  if (!d) return 1000;

  // exact match first
  if (DESIGNATION_TO_DA_RATE.has(d)) return DESIGNATION_TO_DA_RATE.get(d);

  // contains fallback
  for (const [rate, list] of [
    [800, ['project analyst', 'software developer', 'junior software developer', 'senior software developer', 'ui/ux designer', 'data analyst']],
    [900, ['project manager']],
    [1000, ['dg', 'sdg']]
  ]) {
    const [r, arr] = [rate, list];
    if (arr.some((item) => d.includes(normalize(item)))) return r;
  }

  return 1000;
};


const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Create new TADA claim
const createTADAClaim = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      purpose_of_travel,
      travel_from,
      travel_to,
      departure_date,
      return_date,
      remarks,
      expenses = []
    } = req.body;

    if (!purpose_of_travel || !travel_from || !travel_to || !departure_date || !return_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const claimNumber = `TADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const claimResult = await client.query(
        `INSERT INTO tada_claims
         (user_id, claim_number, purpose_of_travel, travel_from, travel_to, departure_date, return_date, remarks, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userId,
          claimNumber,
          purpose_of_travel,
          travel_from,
          travel_to,
          departure_date,
          return_date,
          remarks || null,
          DEFAULT_STATUS
        ]
      );

      const claim = claimResult.rows[0];

      // Fetch designation of the logged-in user for DA enforcement
      const userRow = await client.query(
        'SELECT designation FROM users WHERE id = $1',
        [userId]
      );
      const designation = userRow.rows[0]?.designation || '';

      for (const expense of expenses) {
        const enforcedDA = getDAForDesignationServer(designation);
        const expenseTotal =
          toNumber(expense.fare) +
          toNumber(expense.accommodation) +
          toNumber(expense.conveyance) +
          enforcedDA +
          toNumber(expense.others);

        await client.query(

          `INSERT INTO tada_expenses
           (claim_id, expense_date, place_from, place_to, mode, fare, accommodation, conveyance, da, others, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            claim.id,
            expense.expense_date,
            expense.place_from,
            expense.place_to,
            expense.mode,
            toNumber(expense.fare),
            toNumber(expense.accommodation),
            toNumber(expense.conveyance),
            enforcedDA,
            toNumber(expense.others),
            expenseTotal
          ]
        );
      }


      const expensesResult = await client.query(
        'SELECT SUM(total) as total_amount FROM tada_expenses WHERE claim_id = $1',
        [claim.id]
      );

      const totalAmount = expensesResult.rows[0]?.total_amount || 0;

      await client.query('UPDATE tada_claims SET total_amount = $1 WHERE id = $2', [totalAmount, claim.id]);
      await client.query('COMMIT');

      return res.status(201).json({
        message: 'TADA claim created successfully',
        claim: { ...claim, total_amount: totalAmount }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Failed to create TADA claim' });
  }
};

// Get TADA claims — all claims for superadmin/admin, own claims for regular users
const getTADAClaims = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user.role || '').toLowerCase().replace(/_/g, '').trim();
    const isAdminOrSuper = role === 'admin' || role === 'superadmin';
    const { status } = req.query;

    let query, params;

    if (isAdminOrSuper) {
      // Admin/SuperAdmin see ALL claims with employee info
      query = `
        SELECT c.*, u.full_name, u.email, u.employee_id, u.department
        FROM tada_claims c
        JOIN users u ON c.user_id = u.id
        WHERE 1=1
      `;
      params = [];
      let idx = 1;
      if (status) {
        query += ` AND LOWER(c.status) = LOWER($${idx++})`;
        params.push((status || '').toString().trim());
      }
      query += ' ORDER BY COALESCE(c.created_at, c.submitted_at) DESC';
    } else {
      // Regular users see only their own claims
      query = 'SELECT * FROM tada_claims WHERE user_id = $1';
      params = [userId];
      if (status) {
        query += ' AND LOWER(status) = LOWER($2)';
        params.push((status || '').toString().trim());
      }
      query += ' ORDER BY COALESCE(created_at, submitted_at) DESC';
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Failed to fetch TADA claims' });
  }
};

// Get single TADA claim with expenses
const getTADAClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const claimResult = await db.query(
      'SELECT * FROM tada_claims WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'TADA claim not found' });
    }

    const claim = claimResult.rows[0];

    const expensesResult = await db.query(
      'SELECT * FROM tada_expenses WHERE claim_id = $1 ORDER BY expense_date',
      [id]
    );

    res.json({ ...claim, expenses: expensesResult.rows });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ error: 'Failed to fetch TADA claim' });
  }
};

// Update TADA claim
const updateTADAClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      purpose_of_travel,
      travel_from,
      travel_to,
      departure_date,
      return_date,
      remarks,
      status,
      expenses = []
    } = req.body;

    const claimResult = await db.query(
      'SELECT * FROM tada_claims WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'TADA claim not found' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `UPDATE tada_claims
         SET purpose_of_travel = $1,
             travel_from = $2,
             travel_to = $3,
             departure_date = $4,
             return_date = $5,
             remarks = $6,
             status = COALESCE(LOWER(TRIM($7)), status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          purpose_of_travel,
          travel_from,
          travel_to,
          departure_date,
          return_date,
          remarks || null,
          status ? (status || '').toString().trim() : null,
          id
        ]
      );

      await client.query('DELETE FROM tada_expenses WHERE claim_id = $1', [id]);

      for (const expense of expenses) {
        const expenseTotal =
          toNumber(expense.fare) +
          toNumber(expense.accommodation) +
          toNumber(expense.conveyance) +
          toNumber(expense.da) +
          toNumber(expense.others);

        await client.query(
          `INSERT INTO tada_expenses
           (claim_id, expense_date, place_from, place_to, mode, fare, accommodation, conveyance, da, others, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            expense.expense_date,
            expense.place_from,
            expense.place_to,
            expense.mode,
            toNumber(expense.fare),
            toNumber(expense.accommodation),
            toNumber(expense.conveyance),
            toNumber(expense.da),
            toNumber(expense.others),
            expenseTotal
          ]
        );
      }

      const expensesResult = await client.query(
        'SELECT SUM(total) as total_amount FROM tada_expenses WHERE claim_id = $1',
        [id]
      );

      const totalAmount = expensesResult.rows[0]?.total_amount || 0;
      await client.query('UPDATE tada_claims SET total_amount = $1 WHERE id = $2', [totalAmount, id]);
      await client.query('COMMIT');

      return res.json({
        message: 'TADA claim updated successfully',
        claim: { ...updateResult.rows[0], total_amount: totalAmount }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({ error: 'Failed to update TADA claim' });
  }
};

// Delete TADA claim
const deleteTADAClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const claimResult = await db.query(
      'SELECT * FROM tada_claims WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'TADA claim not found' });
    }

    await db.query('DELETE FROM tada_claims WHERE id = $1', [id]);
    res.json({ message: 'TADA claim deleted successfully' });
  } catch (error) {
    console.error('Delete claim error:', error);
    res.status(500).json({ error: 'Failed to delete TADA claim' });
  }
};

// Add expense to claim
const addExpense = async (req, res) => {
  try {
    const { claimId } = req.params;
    const {
      expense_date,
      place_from,
      place_to,
      mode,
      fare,
      accommodation,
      conveyance,
      da,
      others
    } = req.body;

    const expenseTotal =
      toNumber(fare) +
      toNumber(accommodation) +
      toNumber(conveyance) +
      toNumber(da) +
      toNumber(others);

    const result = await db.query(
      `INSERT INTO tada_expenses
       (claim_id, expense_date, place_from, place_to, mode, fare, accommodation, conveyance, da, others, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        claimId,
        expense_date,
        place_from,
        place_to,
        mode,
        toNumber(fare),
        toNumber(accommodation),
        toNumber(conveyance),
        toNumber(da),
        toNumber(others),
        expenseTotal
      ]
    );

    res.status(201).json({
      message: 'Expense added successfully',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
};

module.exports = {
  createTADAClaim,
  getTADAClaims,
  getTADAClaim,
  updateTADAClaim,
  deleteTADAClaim,
  addExpense
};

