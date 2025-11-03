import { Pool } from 'pg';

// Create a new pool using test database config
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/spirituality_platform_test',
});

/**
 * Clear test data after each test
 */
export async function clearTestData() {
  await pool.query('TRUNCATE users CASCADE');
  await pool.query('TRUNCATE courses CASCADE');
  await pool.query('TRUNCATE orders CASCADE');
  await pool.query('TRUNCATE events CASCADE');
  await pool.query('TRUNCATE reviews CASCADE');
}

/**
 * Setup database before all tests
 */
export async function setupDatabase() {
  try {
    // Verify connection
    await pool.query('SELECT NOW()');
    console.log('Connected to test database');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * Cleanup database after all tests
 */
export async function cleanupDatabase() {
  await clearTestData();
  await pool.end();
}