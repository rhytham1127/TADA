#!/usr/bin/env node

/**
 * Script to create or update a superadmin user in the TADA system
 * Usage: node create-admin.js
 */

const db = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  const adminEmail = 'superadmin@gmail.com';
  const adminPassword = '123456';
  const adminName = 'Super Admin';

  try {
    console.log('🔧 TADA Admin User Setup');
    console.log('━'.repeat(50));

    // Check if user already exists
    console.log(`\n📧 Checking for existing user: ${adminEmail}`);
    const existingUser = await db.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`✓ User found: ${adminEmail}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Current role: ${user.role}`);

      if (user.role === 'admin') {
        console.log(`\n✓ User is already an admin!`);
        await db.pool.end();
        return;
      }

      // Update role to admin
      console.log(`\n🔄 Updating user role to 'admin'...`);
      const updateResult = await db.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, role',
        ['admin', user.id]
      );

      const updatedUser = updateResult.rows[0];
      console.log(`✓ User role updated successfully!`);
      console.log(`  Email: ${updatedUser.email}`);
      console.log(`  Role: ${updatedUser.role}`);
      await db.pool.end();
      return;
    }

    // Create new admin user
    console.log(`\n✨ User not found. Creating new admin user...`);

    // Validate password
    if (adminPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Hash password
    console.log(`🔐 Hashing password...`);
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Insert user
    console.log(`💾 Creating user in database...`);
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, designation, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, created_at`,
      [adminName, adminEmail, hashedPassword, 'admin', 'Administrator', null]
    );

    const newUser = result.rows[0];

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`━`.repeat(50));
    console.log(`📊 User Details:`);
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Name: ${newUser.full_name}`);
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Role: ${newUser.role}`);
    console.log(`  Created: ${new Date(newUser.created_at).toLocaleString()}`);
    console.log(`━`.repeat(50));
    console.log(`\n🔐 Login Credentials:`);
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`\n⚠️  IMPORTANT: Change this password after first login!`);
    console.log(`\n✓ You can now login to the admin panel at: http://localhost:3000/admin`);

    await db.pool.end();

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error);
    await db.pool.end();
    process.exit(1);
  }
}

// Run the script
createAdmin();
