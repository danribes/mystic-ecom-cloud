/**
 * Session Management
 * 
 * Redis-based session handling for user authentication.
 * Sessions are stored in Redis with configurable TTL.
 */

import { randomBytes } from 'crypto';
import type { AstroCookies } from 'astro';
import { getJSON, setJSON, del, expire, ttl } from '@/lib/redis';

// Session configuration
const SESSION_PREFIX = 'session:';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'sid';
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '86400', 10); // 24 hours default
const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';
const SESSION_COOKIE_SAME_SITE: 'strict' | 'lax' | 'none' = 'lax';

/**
 * User session data structure
 */
export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: number;
  lastActivity: number;
}

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get Redis key for session ID
 */
function getSessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`;
}

/**
 * Create a new session
 * 
 * @param userId - User ID
 * @param email - User email
 * @param name - User name
 * @param role - User role
 * @returns Session ID
 */
export async function createSession(
  userId: string,
  email: string,
  name: string,
  role: 'admin' | 'user'
): Promise<string> {
  const sessionId = generateSessionId();
  const sessionKey = getSessionKey(sessionId);

  const sessionData: SessionData = {
    userId,
    email,
    name,
    role,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  await setJSON(sessionKey, sessionData, SESSION_TTL);

  return sessionId;
}

/**
 * Get session data by session ID
 * 
 * @param sessionId - Session ID
 * @returns Session data or null if not found
 */
export async function getSession(
  sessionId: string
): Promise<SessionData | null> {
  if (!sessionId) return null;

  const sessionKey = getSessionKey(sessionId);
  const sessionData = await getJSON<SessionData>(sessionKey);

  if (!sessionData) return null;

  // Update last activity
  sessionData.lastActivity = Date.now();
  await setJSON(sessionKey, sessionData, SESSION_TTL);

  return sessionData;
}

/**
 * Destroy a session
 * 
 * @param sessionId - Session ID to destroy
 */
export async function destroySession(sessionId: string): Promise<void> {
  if (!sessionId) return;

  const sessionKey = getSessionKey(sessionId);
  await del(sessionKey);
}

/**
 * Extend session TTL
 * 
 * @param sessionId - Session ID
 * @param seconds - TTL in seconds (optional, uses default if not provided)
 */
export async function extendSession(
  sessionId: string,
  seconds: number = SESSION_TTL
): Promise<void> {
  if (!sessionId) return;

  const sessionKey = getSessionKey(sessionId);
  await expire(sessionKey, seconds);
}

/**
 * Get remaining session TTL
 * 
 * @param sessionId - Session ID
 * @returns Remaining seconds or -1 if session doesn't exist
 */
export async function getSessionTTL(sessionId: string): Promise<number> {
  if (!sessionId) return -1;

  const sessionKey = getSessionKey(sessionId);
  return await ttl(sessionKey);
}

/**
 * Set session cookie in response
 * 
 * @param cookies - Astro cookies object
 * @param sessionId - Session ID to store
 */
export function setSessionCookie(
  cookies: AstroCookies,
  sessionId: string
): void {
  cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: SESSION_COOKIE_SAME_SITE,
    maxAge: SESSION_TTL,
    path: '/',
  });
}

/**
 * Get session cookie from request
 * 
 * @param cookies - Astro cookies object
 * @returns Session ID or null
 */
export function getSessionCookie(cookies: AstroCookies): string | null {
  const cookie = cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Delete session cookie
 * 
 * @param cookies - Astro cookies object
 */
export function deleteSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
  });
}

/**
 * Get session from request cookies
 * 
 * @param cookies - Astro cookies object
 * @returns Session data or null
 */
export async function getSessionFromRequest(
  cookies: AstroCookies
): Promise<SessionData | null> {
  const sessionId = getSessionCookie(cookies);
  if (!sessionId) return null;

  return await getSession(sessionId);
}

/**
 * Login helper - creates session and sets cookie
 * 
 * @param cookies - Astro cookies object
 * @param userId - User ID
 * @param email - User email
 * @param name - User name
 * @param role - User role
 * @returns Session data
 */
export async function login(
  cookies: AstroCookies,
  userId: string,
  email: string,
  name: string,
  role: 'admin' | 'user'
): Promise<SessionData> {
  const sessionId = await createSession(userId, email, name, role);
  setSessionCookie(cookies, sessionId);

  return {
    userId,
    email,
    name,
    role,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
}

/**
 * Logout helper - destroys session and deletes cookie
 * 
 * @param cookies - Astro cookies object
 */
export async function logout(cookies: AstroCookies): Promise<void> {
  const sessionId = getSessionCookie(cookies);
  if (sessionId) {
    await destroySession(sessionId);
  }
  deleteSessionCookie(cookies);
}

/**
 * Check if user is authenticated
 * 
 * @param cookies - Astro cookies object
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(cookies: AstroCookies): Promise<boolean> {
  const session = await getSessionFromRequest(cookies);
  return session !== null;
}

/**
 * Check if user is admin
 * 
 * @param cookies - Astro cookies object
 * @returns True if user is admin, false otherwise
 */
export async function isAdmin(cookies: AstroCookies): Promise<boolean> {
  const session = await getSessionFromRequest(cookies);
  return session?.role === 'admin';
}
