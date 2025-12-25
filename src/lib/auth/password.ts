/**
 * Password Hashing Utilities
 * 
 * Wrapper functions for bcrypt to handle password hashing and verification.
 * Uses configurable salt rounds for security vs. performance balance.
 */

import bcrypt from 'bcryptjs';

// Get salt rounds from environment or use secure default (10)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

/**
 * Hash a plain text password
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 * 
 * @example
 * const hashed = await hashPassword('mySecurePassword123');
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('[Auth] Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 * 
 * @example
 * const isValid = await verifyPassword('myPassword', hashedPassword);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('[Auth] Password verification error:', error);
    return false;
  }
}

/**
 * Check if a password needs rehashing (e.g., salt rounds changed)
 * 
 * @param hash - Hashed password to check
 * @returns Promise resolving to true if rehashing is recommended
 * 
 * @example
 * if (await needsRehash(user.password_hash)) {
 *   user.password_hash = await hashPassword(plainPassword);
 * }
 */
export async function needsRehash(hash: string): Promise<boolean> {
  try {
    const rounds = await bcrypt.getRounds(hash);
    return rounds !== SALT_ROUNDS;
  } catch (error) {
    console.error('[Auth] Error checking hash rounds:', error);
    return true; // Assume needs rehash on error
  }
}

/**
 * Validate password strength
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - Password to validate
 * @returns Object with isValid flag and error message
 * 
 * @example
 * const validation = validatePasswordStrength('MyPass123!');
 * if (!validation.isValid) {
 *   console.error(validation.message);
 * }
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message: string;
} {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain an uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain a lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain a number' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain a special character',
    };
  }

  return { isValid: true, message: 'Password is strong' };
}

/**
 * Generate a random secure password
 * 
 * @param length - Length of password (default: 16)
 * @returns Random secure password
 * 
 * @example
 * const tempPassword = generateSecurePassword(12);
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
