const db = require('../db');

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { dateFrom, dateTo, userId, action, module, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT al.*, COALESCE(al.user_name, u.email) as display_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (dateFrom) {
      query += ` AND al.created_at >= $${idx++}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND al.created_at <= $${idx++}`;
      params.push(dateTo + 'T23:59:59');
    }
    if (userId) {
      query += ` AND al.user_id = $${idx++}`;
      params.push(userId);
    }
    if (action) {
      query += ` AND al.action ILIKE $${idx++}`;
      params.push('%' + action + '%');
    }
    if (module) {
      query += ` AND al.module ILIKE $${idx++}`;
      params.push('%' + module + '%');
    }

    // Count total — rebuild WHERE clause identically to the main query
    let countQuery = `SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const countParams = [];
    let cIdx = 1;
    if (dateFrom) { countQuery += ` AND al.created_at >= $${cIdx++}`; countParams.push(dateFrom); }
    if (dateTo)   { countQuery += ` AND al.created_at <= $${cIdx++}`; countParams.push(dateTo + 'T23:59:59'); }
    if (userId)   { countQuery += ` AND al.user_id = $${cIdx++}`; countParams.push(userId); }
    if (action)   { countQuery += ` AND al.action ILIKE $${cIdx++}`; countParams.push('%' + action + '%'); }
    if (module)   { countQuery += ` AND al.module ILIKE $${cIdx++}`; countParams.push('%' + module + '%'); }
    const countResult = await db.query(countQuery, countParams);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

module.exports = { getAuditLogs };
