#!/usr/bin/env node

/**
 * Creates (or updates) a Super Admin user in the TADA system.
 *
 * Default credentials:
 *  email:    superadmin@gmail.com
 *  password: 123456
 *  full_name: Super Admin
 *  role:     superadmin
 *
 * IMPORTANT:
 *  - This script only runs with DB access configured in backend/db/index.js
 *  - It sets designation + department columns if present, otherwise ignores.
 */

const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = require('./db');

async function main() {
  const adminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || '123456';
  const adminName = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!adminPassword || adminPassword.length < 6) {
    console.error('SUPERADMIN_PASSWORD must be at least 6 characters');
    process.exit(1);
  }

  console.log('🔧 Setting up Super Admin user...');

  const existing = await db.query('SELECT id, email, role FROM users WHERE email = $1', [adminEmail]);

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    console.log(`✓ Found user with email ${adminEmail} (id=${user.id}, current role=${user.role})`);

    // Force role to superadmin and update password hash.
    await db.query(
      `UPDATE users
       SET role = $1,
           password_hash = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ['superadmin', hashedPassword, user.id]
    );

    console.log('✓ Super Admin role ensured + password updated');
    await db.pool.end();
    return;
  }

  // Create new user.
  // We try to be schema-tolerant: if columns don't exist, we only insert the known columns.
  const resolvedName = adminName.trim();

  // Determine which columns exist
  const colsRes = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name IN ('full_name','name','department','designation','password_hash','phone','role')`
  );
  const cols = new Set(colsRes.rows.map(r => r.column_name));

  const fullNameCol = cols.has('full_name') ? 'full_name' : (cols.has('name') ? 'name' : 'full_name');
  const departmentCol = cols.has('department') ? 'department' : null;
  const designationCol = cols.has('designation') ? 'designation' : null;
  const phoneCol = cols.has('phone') ? 'phone' : null;
  const passwordHashCol = cols.has('password_hash') ? 'password_hash' : 'password_hash';

  const insertCols = [fullNameCol, 'email', passwordHashCol, 'role'];
  const insertVals = [resolvedName, adminEmail.toLowerCase(), hashedPassword, 'superadmin'];
  let placeholders = [1, 2, 3, 4];

  if (departmentCol) {
    insertCols.push(departmentCol);
    insertVals.push(null);
    placeholders.push(insertVals.length);
  }
  if (designationCol) {
    insertCols.push(designationCol);
    insertVals.push(null);
    placeholders.push(insertVals.length);
  }
  if (phoneCol) {
    insertCols.push(phoneCol);
    insertVals.push(null);
    placeholders.push(insertVals.length);
  }

  // Normalize: column list must be valid SQL
  const sql = `INSERT INTO users (${insertCols.join(', ')}, created_at, updated_at)
               VALUES (${placeholders.map(i => `$${i}`).join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id, email, role, full_name, created_at`;

  const result = await db.query(sql, insertVals);
  console.log('✅ Super Admin created successfully');
  console.log('User:', result.rows[0]);

  await db.pool.end();
}

main().catch(async (err) => {
  console.error('❌ Failed:', err);
  try { await db.pool.end(); } catch (_) {}
  process.exit(1);
});

