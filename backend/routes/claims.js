const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, JPG, JPEG, PNG files allowed'));
  }
});

// Generate claim number
const generateClaimNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `TADA-${year}${month}-${random}`;
};

// Create claim
router.post('/', authenticateToken, upload.array('documents', 20), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { purpose_of_travel, travel_from, travel_to, departure_date, return_date, expense_items } = req.body;
    const parsedExpenses = JSON.parse(expense_items || '[]');

    const claimNumber = generateClaimNumber();
    const totalAmount = parsedExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    const claimResult = await client.query(
      `INSERT INTO tada_claims (user_id, claim_number, purpose_of_travel, travel_from, travel_to, departure_date, return_date, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, claimNumber, purpose_of_travel, travel_from, travel_to, departure_date, return_date, totalAmount]
    );

    const claim = claimResult.rows[0];

    // Insert expense items
    for (const item of parsedExpenses) {
      await client.query(
        `INSERT INTO expense_items (claim_id, expense_date, expense_type, description, amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [claim.id, item.expense_date, item.expense_type, item.description, item.amount]
      );
    }

    // Save uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(
          `INSERT INTO claim_documents (claim_id, file_name, file_path, file_type, file_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [claim.id, file.originalname, file.filename, file.mimetype, file.size]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ claim, message: 'Claim submitted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to submit claim' });
  } finally {
    client.release();
  }
});

// Get all claims for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM expense_items WHERE claim_id = c.id) as expense_count,
        (SELECT COUNT(*) FROM claim_documents WHERE claim_id = c.id) as doc_count
       FROM tada_claims c WHERE c.user_id = $1 ORDER BY c.submitted_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Get single claim
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const claimResult = await db.query(
      'SELECT * FROM tada_claims WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (claimResult.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });

    const claim = claimResult.rows[0];

    const expensesResult = await db.query(
      'SELECT * FROM expense_items WHERE claim_id = $1 ORDER BY expense_date',
      [claim.id]
    );

    const docsResult = await db.query(
      'SELECT * FROM claim_documents WHERE claim_id = $1',
      [claim.id]
    );

    res.json({ ...claim, expenses: expensesResult.rows, documents: docsResult.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

module.exports = router;
