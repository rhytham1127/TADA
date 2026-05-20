const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateEmail, validatePassword } = require('../utils/validators');
const { logAudit } = require('../utils/auditLogger');
require('dotenv').config();

// Register new user

const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, designation, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, designation, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, designation, phone, role`,
      [name, email.toLowerCase(), hashedPassword, designation || null, phone || null]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      role: user.role || 'user',
      action: 'register',
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      remarks: 'User self-registered',
      req
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { ...user, role: user.role || 'user' },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    await logAudit({
      userId: user.id,
      userName: user.full_name,
      role: user.role,
      action: 'login',
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      remarks: 'User logged in',
      req
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        designation: user.designation,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, email, designation, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Logout (audit only; token invalidation is client-side)
const logout = async (req, res) => {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.id,
        userName: req.user.full_name || req.user.email,
        role: req.user.role,
        action: 'logout',
        module: 'auth',
        entityType: 'user',
        entityId: req.user.id,
        remarks: 'User logged out',
        req
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.json({ message: 'Logged out' });
  }
};

module.exports = { register, login, getMe, logout };
