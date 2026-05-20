const db = require('../db');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../utils/auditLogger');

const getAllUsers = async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT id, full_name, email, role, department, designation, phone, created_at FROM users';
    const params = [];
    if (q) {
      query += ` WHERE full_name ILIKE $1 OR email ILIKE $1`;
      params.push(`%${q}%`);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, full_name, email, password, department, designation, role: reqRole } = req.body;
    const resolvedName = (full_name || name || '').trim();

    if (!resolvedName) return res.status(400).json({ success: false, error: 'Full name is required' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, error: 'Email is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, error: 'Invalid email format' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    if (!designation || !designation.trim()) return res.status(400).json({ success: false, error: 'Designation is required' });

    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser.rows.length > 0) return res.status(409).json({ success: false, error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const requestedRole = (reqRole || 'admin').toLowerCase().replace(/_/g, '').trim();
    const allowedRoles = new Set(['superadmin', 'admin', 'user']);
    if (!allowedRoles.has(requestedRole)) {
      return res.status(400).json({ success: false, error: `Invalid role. Allowed: admin, superadmin, user` });
    }

    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, department, designation, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, full_name, email, role, department, designation, created_at`,
      [resolvedName, email.toLowerCase(), hashedPassword, department?.trim() || null, designation.trim(), requestedRole]
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.full_name || req.user?.email,
      role: req.user?.role,
      action: 'create_user',
      module: 'user_management',
      entityType: 'user',
      entityId: result.rows[0].id,
      remarks: `Created user: ${resolvedName} (${requestedRole})`,
      req
    });

    res.status(201).json({ success: true, message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, name, email, password, department, designation, role: reqRole } = req.body;
    const resolvedName = (full_name || name || '').trim();

    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    const currentUser = existing.rows[0];

    // Build update fields
    const setClauses = [];
    const params = [];
    let idx = 1;

    if (resolvedName) { setClauses.push(`full_name = $${idx++}`); params.push(resolvedName); }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ success: false, error: 'Invalid email format' });
      setClauses.push(`email = $${idx++}`); params.push(email.toLowerCase());
    }
    if (password) {
      if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      const hashed = await bcrypt.hash(password, 10);
      setClauses.push(`password_hash = $${idx++}`); params.push(hashed);
    }
    if (department !== undefined) { setClauses.push(`department = $${idx++}`); params.push(department?.trim() || null); }
    if (designation !== undefined) { setClauses.push(`designation = $${idx++}`); params.push(designation?.trim() || null); }
    if (reqRole) {
      const allowedRoles = new Set(['superadmin', 'admin', 'user']);
      const normalizedRole = reqRole.toLowerCase().trim();
      if (!allowedRoles.has(normalizedRole)) return res.status(400).json({ success: false, error: 'Invalid role' });
      setClauses.push(`role = $${idx++}`); params.push(normalizedRole);
    }

    if (setClauses.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await db.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, role, department, designation, created_at`,
      params
    );

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.full_name || req.user?.email,
      role: req.user?.role,
      action: 'update_user',
      module: 'user_management',
      entityType: 'user',
      entityId: parseInt(id),
      remarks: `Updated user: ${currentUser.full_name}`,
      req
    });

    res.json({ success: true, message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.query('SELECT role, full_name FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.rows[0].role === 'superadmin') return res.status(403).json({ success: false, error: 'Cannot delete Super Admin users' });

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.full_name || req.user?.email,
      role: req.user?.role,
      action: 'delete_user',
      module: 'user_management',
      entityType: 'user',
      entityId: parseInt(id),
      remarks: `Deleted user: ${user.rows[0].full_name}`,
      req
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, full_name, email, role, department, designation, phone, created_at FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, getUser };
