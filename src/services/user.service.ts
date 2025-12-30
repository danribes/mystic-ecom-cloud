/**
 * User Service
 *
 * Handles user management operations for admin functionality:
 * - List users with pagination and search
 * - Update user roles
 * - Get user statistics
 */

import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  whatsapp: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin' | '';
  sortBy?: 'name' | 'email' | 'created_at' | 'role';
  sortOrder?: 'ASC' | 'DESC';
}

export interface UserListResult {
  users: User[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

/**
 * List users with pagination, search, and filtering
 */
export async function listUsers(options: UserListOptions = {}): Promise<UserListResult> {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const offset = (page - 1) * limit;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Build WHERE clause
  const conditions: string[] = ['deleted_at IS NULL'];

  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (role) {
    conditions.push(`role = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort column to prevent SQL injection
  const validSortColumns = ['name', 'email', 'created_at', 'role'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  // Count total
  const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
  const countResult = await query<{ count: string }>(countQuery, params);
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  // Get users
  const usersQuery = `
    SELECT
      id,
      email,
      name,
      role,
      whatsapp,
      COALESCE(email_verified, false) as email_verified,
      created_at,
      updated_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDir}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const usersResult = await query<User>(usersQuery, params);

  return {
    users: usersResult.rows,
    total,
    totalPages: Math.ceil(total / limit),
    page,
    limit
  };
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT
      id,
      email,
      name,
      role,
      whatsapp,
      COALESCE(email_verified, false) as email_verified,
      created_at,
      updated_at
    FROM users
    WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string,
  newRole: 'user' | 'admin',
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  // Prevent admin from changing their own role
  if (userId === adminUserId) {
    return { success: false, message: 'Cannot change your own role' };
  }

  // Check if user exists
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Check if role is actually changing
  if (user.role === newRole) {
    return { success: false, message: `User is already a ${newRole}` };
  }

  // Update the role
  await query(
    'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newRole, userId]
  );

  return {
    success: true,
    message: `User role updated to ${newRole}`
  };
}

/**
 * Update user details (admin function)
 */
export async function updateUser(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    whatsapp?: string | null;
    role?: 'user' | 'admin';
    email_verified?: boolean;
  },
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  // Check if user exists
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Prevent admin from changing their own role
  if (userId === adminUserId && updates.role && updates.role !== user.role) {
    return { success: false, message: 'Cannot change your own role' };
  }

  // Build update query dynamically
  const setClauses: string[] = [];
  const params: (string | boolean | null)[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex}`);
    params.push(updates.name);
    paramIndex++;
  }

  if (updates.email !== undefined) {
    // Check if email is already taken by another user
    const emailCheck = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
      [updates.email, userId]
    );
    if (emailCheck.rows.length > 0) {
      return { success: false, message: 'Email is already in use by another user' };
    }
    setClauses.push(`email = $${paramIndex}`);
    params.push(updates.email);
    paramIndex++;
  }

  if (updates.whatsapp !== undefined) {
    setClauses.push(`whatsapp = $${paramIndex}`);
    params.push(updates.whatsapp);
    paramIndex++;
  }

  if (updates.role !== undefined) {
    setClauses.push(`role = $${paramIndex}`);
    params.push(updates.role);
    paramIndex++;
  }

  if (updates.email_verified !== undefined) {
    setClauses.push(`email_verified = $${paramIndex}`);
    params.push(updates.email_verified);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return { success: false, message: 'No updates provided' };
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  const updateQuery = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
  `;

  await query(updateQuery, params);

  return {
    success: true,
    message: 'User updated successfully'
  };
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<{
  totalUsers: number;
  totalAdmins: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
}> {
  const statsQuery = `
    SELECT
      COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_users,
      COUNT(*) FILTER (WHERE role = 'admin' AND deleted_at IS NULL) as total_admins,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE) AND deleted_at IS NULL) as new_users_this_month,
      COUNT(*) FILTER (WHERE email_verified = true AND deleted_at IS NULL) as verified_users
    FROM users
  `;

  const result = await query<{
    total_users: string;
    total_admins: string;
    new_users_this_month: string;
    verified_users: string;
  }>(statsQuery);

  const row = result.rows[0];

  return {
    totalUsers: parseInt(row?.total_users || '0', 10),
    totalAdmins: parseInt(row?.total_admins || '0', 10),
    newUsersThisMonth: parseInt(row?.new_users_this_month || '0', 10),
    verifiedUsers: parseInt(row?.verified_users || '0', 10)
  };
}

/**
 * Create a new user (admin function)
 */
export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
  whatsapp?: string | null;
  email_verified?: boolean;
}): Promise<{ success: boolean; message: string; userId?: string }> {
  // Check if email is already taken
  const emailCheck = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
    [userData.email]
  );
  if (emailCheck.rows.length > 0) {
    return { success: false, message: 'Email is already in use' };
  }

  // Hash the password
  const passwordHash = await hashPassword(userData.password);

  // Insert the new user
  const result = await query<{ id: string }>(
    `INSERT INTO users (
      name,
      email,
      password_hash,
      role,
      whatsapp,
      email_verified,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id`,
    [
      userData.name,
      userData.email,
      passwordHash,
      userData.role || 'user',
      userData.whatsapp || null,
      userData.email_verified || false
    ]
  );

  const newUserId = result.rows[0]?.id;

  if (!newUserId) {
    return { success: false, message: 'Failed to create user' };
  }

  return {
    success: true,
    message: 'User created successfully',
    userId: newUserId
  };
}

/**
 * Soft delete a user (admin function)
 */
export async function deleteUser(
  userId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  // Prevent admin from deleting themselves
  if (userId === adminUserId) {
    return { success: false, message: 'Cannot delete your own account' };
  }

  // Check if user exists
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // Soft delete the user
  await query(
    'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );

  return {
    success: true,
    message: 'User deleted successfully'
  };
}
