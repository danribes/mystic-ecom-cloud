#!/usr/bin/env node

/**
 * Database Setup Script (HTTP/Serverless Version)
 *
 * Uses Neon's serverless driver which operates over HTTP/WebSocket
 * to bypass network restrictions that block direct PostgreSQL connections.
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file manually
try {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf8');
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
} catch (err) {
  console.log('Note: Could not load .env file');
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL not set');
  process.exit(1);
}

console.log('🗄️  Database Setup Script (HTTP Mode)');
console.log('=====================================\n');

const sql = neon(connectionString);

async function executeStatement(stmt, index, total) {
  const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
  try {
    await sql(stmt);
    console.log(`   ✅ [${index}/${total}] ${preview}`);
    return { success: true };
  } catch (err) {
    if (err.message.includes('already exists') ||
        err.message.includes('duplicate') ||
        err.code === '42710' ||
        err.code === '42P07') {
      console.log(`   ⏭️  [${index}/${total}] Already exists: ${preview}`);
      return { skipped: true };
    } else {
      console.error(`   ❌ [${index}/${total}] Error: ${err.message}`);
      return { error: true };
    }
  }
}

async function main() {
  try {
    // Test connection
    console.log('Connecting to Neon PostgreSQL via HTTP...');
    const result = await sql`SELECT NOW() as now, current_database() as db`;
    console.log(`✅ Connected to database: ${result[0].db}`);
    console.log(`   Server time: ${result[0].now}\n`);

    // Read schema
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    console.log('📄 Loading schema from database/schema.sql...');

    // Parse statements
    const statements = [];
    let currentStatement = '';
    let inFunction = false;

    schema.split('\n').forEach(line => {
      if (currentStatement === '' && (line.trim() === '' || line.trim().startsWith('--'))) {
        return;
      }
      currentStatement += line + '\n';
      if (line.includes('$$')) {
        inFunction = !inFunction;
      }
      if (!inFunction && line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    });

    console.log(`   Found ${statements.length} SQL statements\n`);
    console.log('🚀 Executing schema...\n');

    let successCount = 0, skipCount = 0, errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const result = await executeStatement(statements[i], i + 1, statements.length);
      if (result.success) successCount++;
      else if (result.skipped) skipCount++;
      else if (result.error) errorCount++;
    }

    console.log('\n=====================================');
    console.log('📊 Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('=====================================\n');

    if (errorCount === 0) {
      console.log('🎉 Database setup completed successfully!\n');

      // List tables
      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      console.log('📋 Created tables:');
      tables.forEach(row => console.log(`   - ${row.table_name}`));
      console.log('');
    }

  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  }
}

main();
