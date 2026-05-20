const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = new Set([
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5001',
      'http://192.168.0.216:5000',
      'http://192.168.0.216:5001',
    ]);
    if (allowed.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tada', require('./routes/tadaRoutes'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Designations (also accessible without auth for register page)
app.use('/api/designations', (req, res, next) => {
  const { getDesignations } = require('./controllers/designationController');
  return getDesignations(req, res, next);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'TADA API running' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;

const runMigrations = require('./utils/runMigrations');
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`TADA Backend running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Startup migration failed, starting anyway:', err.message);
  app.listen(PORT, () => {
    console.log(`TADA Backend running on port ${PORT}`);
  });
});
