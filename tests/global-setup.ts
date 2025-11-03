import type { FullConfig } from '@playwright/test';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  const dbName = 'spirituality_platform_test';
  const maintenancePool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace(dbName, 'postgres') || `postgresql://postgres:postgres_dev_password@localhost:5432/postgres`,
  });

  try {
    console.log('Connecting to maintenance database...');
    const client = await maintenancePool.connect();
    console.log('Successfully connected to maintenance database.');

    const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (dbExists.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
    client.release();
  } catch (error) {
    console.error('Failed to create the test database:', error);
    process.exit(1);
  } finally {
    await maintenancePool.end();
    console.log('Maintenance database connection closed.');
  }


  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/spirituality_platform_test',
  });

  try {
    console.log('Connecting to the test database...');
    await pool.connect();
    console.log('Successfully connected to the test database.');

    console.log('Dropping all tables and types...');
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;

        -- Drop all types
        FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('All tables and types dropped.');

    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('Applying database schema...');
    await pool.query(schema);
    console.log('Database schema applied successfully.');

  } catch (error) {
    console.error('Failed to set up the test database:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}


async function globalSetup(config: FullConfig) {
  await setupDatabase();

  // Prevent vitest global matchers from conflicting with Playwright
  // This is needed because vitest.config.ts setupFiles runs before Playwright
  if (global && typeof global === 'object') {
    // Remove vitest global matchers if they exist
    const vitestSymbols = Object.getOwnPropertySymbols(global).filter(
      s => s.toString().includes('jest-matchers')
    );
    vitestSymbols.forEach(sym => {
      try {
        delete (global as any)[sym];
      } catch {
        // Symbol property might not be deletable
      }
    });
  }
}

export default globalSetup;
