#!/usr/bin/env node

/**
 * Admin User Seeding Script
 *
 * Creates an admin user with specified credentials.
 *
 * Usage:
 *   node scripts/seed-admin.cjs
 *
 * Or with npm:
 *   npm run db:seed-admin
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env if available
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.log('Note: Could not load .env file, using existing environment variables');
}

async function seedAdmin() {
  // Dynamically import dependencies
  let Pool, bcrypt;
  try {
    const pg = require('pg');
    Pool = pg.Pool;
  } catch (err) {
    console.error('Error: pg module not found. Install it with: npm install pg');
    process.exit(1);
  }

  try {
    bcrypt = require('bcryptjs');
  } catch (err) {
    console.error('Error: bcryptjs module not found. Install it with: npm install bcryptjs');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is not set');
    console.error('Please ensure your .env file contains a valid DATABASE_URL');
    process.exit(1);
  }

  // Admin user credentials
  const adminEmail = 'admin@admin.com';
  const adminPassword = 'admin1234';
  const adminName = 'Admin';

  console.log('👤 Admin User Seeding Script');
  console.log('============================\n');
  console.log('Connecting to PostgreSQL...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW() as now, current_database() as db');
    console.log(`✅ Connected to database: ${testResult.rows[0].db}\n`);

    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.role === 'admin') {
        console.log(`⚠️  Admin user already exists: ${adminEmail}`);
        console.log('   Updating password...');

        // Update password
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
          [passwordHash, adminEmail]
        );
        console.log('✅ Password updated successfully!\n');
      } else {
        console.log(`⚠️  User exists but is not admin. Updating role to admin...`);
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(
          'UPDATE users SET password_hash = $1, role = $2, updated_at = NOW() WHERE email = $3',
          [passwordHash, 'admin', adminEmail]
        );
        console.log('✅ User promoted to admin and password updated!\n');
      }
    } else {
      // Create new admin user
      console.log('Creating new admin user...');
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)`,
        [adminEmail, passwordHash, adminName, 'admin']
      );
      console.log('✅ Admin user created successfully!\n');
    }

    console.log('============================');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log('============================\n');
    console.log('🎉 You can now log in at /auth/login with these credentials.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔒 Connection closed.\n');
  }
}

seedAdmin();
