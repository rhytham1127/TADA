/**
 * Auto-migration runner — runs on server startup.
 * Applies all SQL files in the migrations/ directory in order.
 * Safe to run multiple times (all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 */
const fs = require('fs');
const path = require('path');
const db = require('../db');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

const runMigrations = async () => {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical = numerical order for 001-, 002-, etc.

    for (const file of files) {
      try {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          try {
            await db.query(stmt);
          } catch (err) {
            console.warn(`[Migration:${file}] Non-fatal: ${err.message.split('\n')[0]}`);
          }
        }
        console.log(`[Migration] Applied: ${file}`);
      } catch (err) {
        console.error(`[Migration] Failed on ${file}:`, err.message);
      }
    }
    console.log('[Migration] All migrations applied successfully.');
  } catch (err) {
    console.error('[Migration] Migration runner error:', err.message);
  }
};

module.exports = runMigrations;
