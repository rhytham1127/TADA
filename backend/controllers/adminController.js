const db = require('../db');
const { logAudit } = require('../utils/auditLogger');
const { CLAIM_STATUS, APPROVAL_MESSAGE } = require('../constants/claimStatus');
const { validateStatusTransition } = require('../utils/validateStatusTransition');

// Get all claims (admin view)
const getAllClaims = async (req, res) => {
  try {
    const { status, search, dateFrom, dateTo, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    let query = `
      SELECT c.*, u.full_name, u.email, u.employee_id, u.department
      FROM tada_claims c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND LOWER(c.status) = LOWER($${paramIndex})`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (c.claim_number ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push('%' + search + '%');
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND c.created_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND c.created_at <= $${paramIndex}`;
      params.push(dateTo + 'T23:59:59');
      paramIndex++;
    }

    const allowedSort = ['created_at', 'total_amount', 'claim_number', 'status'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ' ORDER BY ' + sortField + ' ' + sortDir;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
};

// Get single claim (admin view)
const getClaimAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const claimResult = await db.query(
      `SELECT c.*, u.full_name, u.email, u.employee_id, u.department
       FROM tada_claims c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = claimResult.rows[0];

    const expensesResult = await db.query(
      'SELECT * FROM tada_expenses WHERE claim_id = $1 ORDER BY expense_date',
      [id]
    );

    const bankResult = await db.query(
      'SELECT * FROM bank_details WHERE user_id = $1',
      [claim.user_id]
    );

    const filesResult = await db.query(
      'SELECT id, file_name, file_path, file_type, file_size, uploaded_at FROM claim_documents WHERE claim_id = $1 ORDER BY uploaded_at DESC',
      [id]
    );

    let auditRows = [];
    try {
      const auditResult = await db.query(
        `SELECT cal.*, u.full_name as actor_name, u.email as actor_email
         FROM claim_audit_logs cal
         LEFT JOIN users u ON cal.performed_by = u.id
         WHERE cal.claim_id = $1
         ORDER BY cal.created_at DESC`,
        [id]
      );
      auditRows = auditResult.rows;
    } catch (e) {
      console.warn('Audit log fetch failed (non-fatal):', e.message);
    }

    res.json({
      ...claim,
      expenses: expensesResult.rows,
      bank_details: bankResult.rows[0] || null,
      documents: filesResult.rows,
      audit_trail: auditRows
    });
  } catch (error) {
    console.error('Get claim admin error:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
};

// Approve claim (Admin/SuperAdmin)
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const actorId = req.user && req.user.id;

    if (!actorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch current claim
    const current = await db.query('SELECT * FROM tada_claims WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const currentStatus = (current.rows[0].status || '').toLowerCase().trim();

    // Allow approve when status is 'submitted' or 'pending'
    const validation = validateStatusTransition(currentStatus, ['submitted', 'pending']);
    if (!validation.ok) {
      return res.status(400).json({
        error: `Cannot approve claim with status "${currentStatus}". Only submitted/pending claims can be approved.`
      });
    }

    // Check which optional columns exist in the DB to build a safe UPDATE
    const colCheck = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tada_claims'
        AND column_name IN ('approved_by', 'approved_at', 'approval_message', 'remarks')
    `);
    const existingCols = new Set(colCheck.rows.map(r => r.column_name));

    // Build dynamic SET clause based on what columns actually exist
    const setClauses = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const queryParams = [CLAIM_STATUS.APPROVED];
    let pIdx = 2;

    if (existingCols.has('approval_message')) {
      setClauses.push(`approval_message = $${pIdx++}`);
      queryParams.push(APPROVAL_MESSAGE);
    }
    if (existingCols.has('remarks')) {
      const cleanRemarks = (remarks && remarks.toString().trim()) ? remarks.toString().trim() : null;
      setClauses.push(`remarks = COALESCE($${pIdx++}, remarks)`);
      queryParams.push(cleanRemarks);
    }
    if (existingCols.has('approved_by')) {
      setClauses.push(`approved_by = $${pIdx++}`);
      queryParams.push(actorId);
    }
    if (existingCols.has('approved_at')) {
      setClauses.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    queryParams.push(id);
    const updateSQL = `UPDATE tada_claims SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const result = await db.query(updateSQL, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Audit log (non-fatal if table missing)
    try {
      await db.query(
        'INSERT INTO claim_audit_logs (claim_id, action, performed_by, remarks) VALUES ($1, $2, $3, $4)',
        [id, 'approved', actorId, remarks || null]
      );
    } catch (e) {
      console.warn('Audit log (approved) failed (non-fatal):', e.message);
    }

    res.json({ message: 'Claim approved successfully', claim: result.rows[0] });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve claim' });
  }
};

// Reject claim (Admin/SuperAdmin)
const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const actorId = req.user && req.user.id;

    if (!actorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Rejection remarks are required' });
    }

    const current = await db.query('SELECT status FROM tada_claims WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const currentStatus = (current.rows[0].status || '').toLowerCase().trim();
    const validation = validateStatusTransition(currentStatus, ['submitted', 'pending']);
    if (!validation.ok) {
      return res.status(400).json({
        error: `Cannot reject claim with status "${currentStatus}". Only submitted/pending claims can be rejected.`
      });
    }

    // Check which columns exist
    const colCheck = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tada_claims'
        AND column_name IN ('rejected_by', 'rejected_at', 'remarks')
    `);
    const existingCols = new Set(colCheck.rows.map(r => r.column_name));

    const setClauses = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const queryParams = [CLAIM_STATUS.REJECTED];
    let pIdx = 2;

    if (existingCols.has('remarks')) {
      setClauses.push(`remarks = $${pIdx++}`);
      queryParams.push(remarks);
    }
    if (existingCols.has('rejected_by')) {
      setClauses.push(`rejected_by = $${pIdx++}`);
      queryParams.push(actorId);
    }
    if (existingCols.has('rejected_at')) {
      setClauses.push(`rejected_at = CURRENT_TIMESTAMP`);
    }

    queryParams.push(id);
    const updateSQL = `UPDATE tada_claims SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const result = await db.query(updateSQL, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    try {
      await db.query(
        'INSERT INTO claim_audit_logs (claim_id, action, performed_by, remarks) VALUES ($1, $2, $3, $4)',
        [id, 'rejected', actorId, remarks]
      );
    } catch (e) {
      console.warn('Audit log (rejected) failed (non-fatal):', e.message);
    }

    res.json({ message: 'Claim rejected successfully', claim: result.rows[0] });
  } catch (error) {
    console.error('Reject claim error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject claim' });
  }
};

// Get dashboard stats (admin + superadmin)
const getAdminStats = async (req, res) => {
  try {
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_claims,
        COUNT(CASE WHEN LOWER(status) = 'draft' THEN 1 END) as draft_claims,
        COUNT(CASE WHEN LOWER(status) IN ('submitted', 'pending') THEN 1 END) as submitted_claims,
        COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END) as approved_claims,
        COUNT(CASE WHEN LOWER(status) = 'rejected' THEN 1 END) as rejected_claims,
        SUM(CASE WHEN LOWER(status) = 'approved' THEN total_amount ELSE 0 END) as approved_amount,
        SUM(total_amount) as total_amount
      FROM tada_claims
    `);

    const stats = statsResult.rows[0];

    // Also get user count (non-fatal)
    let total_users = 0;
    try {
      const usersResult = await db.query(`SELECT COUNT(*) as cnt FROM users`);
      total_users = parseInt(usersResult.rows[0].cnt) || 0;
    } catch (e) { /* non-fatal */ }

    res.json({
      total_claims: parseInt(stats.total_claims) || 0,
      draft_claims: parseInt(stats.draft_claims) || 0,
      submitted_claims: parseInt(stats.submitted_claims) || 0,
      approved_claims: parseInt(stats.approved_claims) || 0,
      rejected_claims: parseInt(stats.rejected_claims) || 0,
      approved_amount: parseFloat(stats.approved_amount || 0),
      total_amount: parseFloat(stats.total_amount || 0),
      total_users
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Super Admin only: Revert approved claim back to submitted (within 24 hours)
const revertClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const actorId = req.user && req.user.id;

    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!remarks || !remarks.trim()) return res.status(400).json({ error: 'Revert remarks are required' });

    const current = await db.query('SELECT status, approved_at FROM tada_claims WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });

    const currentStatus = (current.rows[0].status || '').toLowerCase().trim();
    const validation = validateStatusTransition(currentStatus, ['approved']);
    if (!validation.ok) {
      return res.status(400).json({ error: `Cannot revert claim with status "${currentStatus}".` });
    }

    const approvedAt = current.rows[0].approved_at;
    if (approvedAt) {
      const diffHours = (new Date() - new Date(approvedAt)) / (1000 * 60 * 60);
      if (diffHours > 24) {
        return res.status(400).json({ error: 'Revert not allowed. More than 24 hours have passed since approval.' });
      }
    }

    // Check which columns exist
    const colCheck = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tada_claims'
        AND column_name IN ('reverted_by', 'reverted_at', 'approved_by', 'approved_at', 'approval_message', 'remarks')
    `);
    const existingCols = new Set(colCheck.rows.map(r => r.column_name));

    const setClauses = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const queryParams = [CLAIM_STATUS.SUBMITTED];
    let pIdx = 2;

    if (existingCols.has('remarks')) { setClauses.push(`remarks = $${pIdx++}`); queryParams.push(remarks); }
    if (existingCols.has('approved_by')) setClauses.push(`approved_by = NULL`);
    if (existingCols.has('approved_at')) setClauses.push(`approved_at = NULL`);
    if (existingCols.has('approval_message')) setClauses.push(`approval_message = NULL`);
    if (existingCols.has('reverted_by')) { setClauses.push(`reverted_by = $${pIdx++}`); queryParams.push(actorId); }
    if (existingCols.has('reverted_at')) setClauses.push(`reverted_at = CURRENT_TIMESTAMP`);

    queryParams.push(id);
    const updateSQL = `UPDATE tada_claims SET ${setClauses.join(', ')} WHERE id = $${pIdx} AND LOWER(status) = 'approved' RETURNING *`;

    const result = await db.query(updateSQL, queryParams);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Revert failed. Claim must be approved.' });
    }

    try {
      await db.query(
        'INSERT INTO claim_audit_logs (claim_id, action, performed_by, remarks) VALUES ($1, $2, $3, $4)',
        [id, 'reverted_to_submitted', actorId, remarks]
      );
    } catch (e) {
      console.warn('Audit log (reverted) failed (non-fatal):', e.message);
    }

    res.json({ message: 'Claim reverted to submitted successfully', claim: result.rows[0] });
  } catch (error) {
    console.error('Revert claim error:', error);
    res.status(500).json({ error: error.message || 'Failed to revert claim' });
  }
};

module.exports = { getAllClaims, getClaimAdmin, approveClaim, rejectClaim, revertClaim, getAdminStats };
