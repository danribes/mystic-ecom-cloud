#!/usr/bin/env node

/**
 * Database Setup Script
 *
 * This script initializes the Neon PostgreSQL database with the required schema.
 * Run this script after setting up your .env file with the DATABASE_URL.
 *
 * Usage:
 *   node scripts/setup-database.js
 *
 * Or with npm:
 *   npm run db:setup
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

async function setupDatabase() {
  // Dynamically import pg
  let Pool;
  try {
    const pg = require('pg');
    Pool = pg.Pool;
  } catch (err) {
    console.error('Error: pg module not found. Install it with: npm install pg');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is not set');
    console.error('Please ensure your .env file contains a valid DATABASE_URL');
    process.exit(1);
  }

  console.log('🗄️  Database Setup Script');
  console.log('========================\n');
  console.log('Connecting to Neon PostgreSQL...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW() as now, current_database() as db');
    console.log(`✅ Connected to database: ${testResult.rows[0].db}`);
    console.log(`   Server time: ${testResult.rows[0].now}\n`);

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('Error: database/schema.sql not found');
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Loading schema from database/schema.sql...');

    // Split schema into statements (handling functions and triggers properly)
    const statements = [];
    let currentStatement = '';
    let inFunction = false;

    schema.split('\n').forEach(line => {
      // Skip empty lines and comments at the start of statements
      if (currentStatement === '' && (line.trim() === '' || line.trim().startsWith('--'))) {
        return;
      }

      currentStatement += line + '\n';

      // Track if we're inside a function definition
      if (line.includes('$$')) {
        inFunction = !inFunction;
      }

      // Check for statement end
      if (!inFunction && line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    });

    console.log(`   Found ${statements.length} SQL statements\n`);
    console.log('🚀 Executing schema...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

      try {
        await pool.query(stmt);
        successCount++;
        console.log(`   ✅ [${i + 1}/${statements.length}] ${preview}`);
      } catch (err) {
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate key') ||
            err.code === '42710' || // duplicate_object
            err.code === '42P07')   // duplicate_table
        {
          skipCount++;
          console.log(`   ⏭️  [${i + 1}/${statements.length}] Already exists: ${preview}`);
        } else {
          errorCount++;
          console.error(`   ❌ [${i + 1}/${statements.length}] Error: ${err.message}`);
          console.error(`      Statement: ${preview}`);
        }
      }
    }

    console.log('\n========================');
    console.log('📊 Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('========================\n');

    if (errorCount === 0) {
      console.log('🎉 Database setup completed successfully!\n');

      // Verify tables
      const tablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      console.log('📋 Created tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('⚠️  Database setup completed with some errors.\n');
    }

  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔒 Connection closed.\n');
  }
}

setupDatabase();
