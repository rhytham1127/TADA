const db = require('../db');

const SEED_DESIGNATIONS = [
  { name: 'Project Analyst', da_rate: 800 },
  { name: 'Software Developer', da_rate: 800 },
  { name: 'Junior Software Developer', da_rate: 800 },
  { name: 'Senior Software Developer', da_rate: 800 },
  { name: 'UI/UX Designer', da_rate: 800 },
  { name: 'Data Analyst', da_rate: 800 },
  { name: 'System Administrator', da_rate: 800 },
  { name: 'Operations Executive', da_rate: 800 },
  { name: 'Project Manager', da_rate: 900 },
  { name: 'Assistant Manager', da_rate: 900 },
  { name: 'Branch Manager', da_rate: 900 },
  { name: 'Regional Head', da_rate: 900 },
  { name: 'Clerk', da_rate: 800 },
  { name: 'Cashier', da_rate: 800 },
  { name: 'SDG', da_rate: 1000 },
  { name: 'DG', da_rate: 1000 },
  { name: 'Director General', da_rate: 1000 },
  { name: 'Director', da_rate: 1000 },
];

const getDesignations = async (req, res) => {
  try {
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS designation_masters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        da_rate INTEGER NOT NULL DEFAULT 1000,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if table has data
    const countResult = await db.query('SELECT COUNT(*) FROM designation_masters');
    const count = parseInt(countResult.rows[0].count);

    // Seed if empty
    if (count === 0) {
      for (const d of SEED_DESIGNATIONS) {
        await db.query(
          'INSERT INTO designation_masters (name, da_rate) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
          [d.name, d.da_rate]
        );
      }
    }

    const result = await db.query(
      'SELECT id, name, da_rate FROM designation_masters WHERE is_active = TRUE ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get designations error:', error);
    // Even on DB error, return the hardcoded list so the UI always works
    res.json(SEED_DESIGNATIONS.map((d, i) => ({ id: i + 1, ...d })));
  }
};

module.exports = { getDesignations };
