/**
 * T062: User Profile API Tests
 * 
 * Tests for the profile update API endpoint:
 * - Name updates
 * - Email updates with verification
 * - WhatsApp updates
 * - Password changes
 * - Validation and security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPool } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import type { Pool } from 'pg';

describe('Profile API - Name Updates', () => {
  let pool: Pool;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test user
    const passwordHash = await hashPassword('TestPassword123');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['profile-test@example.com', passwordHash, 'Test User', 'user', true]
    );
    testUserId = userResult.rows[0].id;

    // Create session
    testSessionId = await createSession(
      testUserId,
      'profile-test@example.com',
      'Test User',
      'user'
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['profile-test@example.com']);
  });

  it('should update user name successfully', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        name: 'Updated Test User',
      }),
    });

    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Updated Test User');
  });

  it('should trim whitespace from name', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        name: '  Trimmed Name  ',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Trimmed Name');
  });

  it('should reject empty name', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        name: '',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No updates provided');
  });
});

describe('Profile API - Email Updates', () => {
  let pool: Pool;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test user
    const passwordHash = await hashPassword('TestPassword123');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['email-test@example.com', passwordHash, 'Email Test', 'user', true]
    );
    testUserId = userResult.rows[0].id;

    // Create session
    testSessionId = await createSession(
      testUserId,
      'email-test@example.com',
      'Email Test',
      'user'
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'email-test@example.com',
      'newemail@example.com',
    ]);
  });

  it('should update email and require verification', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        email: 'newemail@example.com',
      }),
    });

    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('newemail@example.com');
    expect(result.user.emailVerified).toBe(false);
    expect(result.updates.emailVerificationRequired).toBe(true);
  });

  it('should reject invalid email format', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        email: 'invalid-email',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('should prevent duplicate email', async () => {
    // Create another user
    const passwordHash = await hashPassword('TestPassword123');
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)`,
      ['duplicate@example.com', passwordHash, 'Duplicate User', 'user']
    );

    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        email: 'duplicate@example.com',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Email is already in use by another account');

    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['duplicate@example.com']);
  });

  it('should normalize email to lowercase', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        email: 'NewEmail@Example.COM',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('newemail@example.com');
  });
});

describe('Profile API - WhatsApp Updates', () => {
  let pool: Pool;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test user
    const passwordHash = await hashPassword('TestPassword123');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['whatsapp-test@example.com', passwordHash, 'WhatsApp Test', 'user']
    );
    testUserId = userResult.rows[0].id;

    // Create session
    testSessionId = await createSession(
      testUserId,
      'whatsapp-test@example.com',
      'WhatsApp Test',
      'user'
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['whatsapp-test@example.com']);
  });

  it('should update WhatsApp number', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        whatsapp: '+1234567890',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.whatsapp).toBe('+1234567890');
  });

  it('should allow clearing WhatsApp number', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        whatsapp: '',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.whatsapp).toBeNull();
  });

  it('should trim WhatsApp number', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        whatsapp: '  +9876543210  ',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.whatsapp).toBe('+9876543210');
  });
});

describe('Profile API - Password Changes', () => {
  let pool: Pool;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test user
    const passwordHash = await hashPassword('OldPassword123');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['password-test@example.com', passwordHash, 'Password Test', 'user']
    );
    testUserId = userResult.rows[0].id;

    // Create session
    testSessionId = await createSession(
      testUserId,
      'password-test@example.com',
      'Password Test',
      'user'
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['password-test@example.com']);
  });

  it('should change password with correct current password', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.updates.passwordChanged).toBe(true);
  });

  it('should reject password change with incorrect current password', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword789',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Current password is incorrect');
  });

  it('should reject short new password', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        currentPassword: 'NewPassword456',
        newPassword: 'short',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('New password must be at least 8 characters long');
  });

  it('should require current password for new password', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        newPassword: 'NewPassword999',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Current password is required to set a new password');
  });
});

describe('Profile API - Multiple Updates', () => {
  let pool: Pool;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test user
    const passwordHash = await hashPassword('MultiPassword123');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['multi-test@example.com', passwordHash, 'Multi Test', 'user', true]
    );
    testUserId = userResult.rows[0].id;

    // Create session
    testSessionId = await createSession(
      testUserId,
      'multi-test@example.com',
      'Multi Test',
      'user'
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'multi-test@example.com',
      'multi-new@example.com',
    ]);
  });

  it('should update multiple fields at once', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        name: 'Updated Multi User',
        whatsapp: '+1122334455',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Updated Multi User');
    expect(result.user.whatsapp).toBe('+1122334455');
  });

  it('should handle name, email, and password changes together', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        name: 'Complete Update',
        email: 'multi-new@example.com',
        currentPassword: 'MultiPassword123',
        newPassword: 'NewMultiPass456',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Complete Update');
    expect(result.user.email).toBe('multi-new@example.com');
    expect(result.user.emailVerified).toBe(false);
    expect(result.updates.passwordChanged).toBe(true);
    expect(result.updates.emailVerificationRequired).toBe(true);
  });
});

describe('Profile API - Authentication', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Unauthorized Update',
      }),
    });

    const result = await response.json();
    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });

  it('should reject invalid session', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sid=invalid-session-id',
      },
      body: JSON.stringify({
        name: 'Unauthorized Update',
      }),
    });

    const result = await response.json();
    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication required');
  });
});

describe('Profile API - Edge Cases', () => {
  let pool: Pool;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test user
    const passwordHash = await hashPassword('EdgePassword123');
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['edge-test@example.com', passwordHash, 'Edge Test', 'user']
    );
    testUserId = userResult.rows[0].id;

    // Create session
    testSessionId = await createSession(
      testUserId,
      'edge-test@example.com',
      'Edge Test',
      'user'
    );
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE email = $1', ['edge-test@example.com']);
  });

  it('should reject empty update request', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No updates provided');
  });

  it('should handle same email update (no change)', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        email: 'edge-test@example.com', // Same email
        name: 'Updated Name',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Updated Name');
    expect(result.updates.emailVerificationRequired).toBeUndefined();
  });

  it('should support PATCH method', async () => {
    const response = await fetch('http://localhost:4321/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${testSessionId}`,
      },
      body: JSON.stringify({
        name: 'PATCH Update',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.name).toBe('PATCH Update');
  });
});
