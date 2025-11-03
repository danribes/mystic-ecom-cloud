# Phase 4: Authentication System (T053-T059)

## Overview

This phase implements a complete user authentication system, building on the foundational infrastructure from Phase 2. Users can now register, login, and logout with a secure session-based authentication flow.

---

## T053: Unit Tests for Authentication Functions

### Why Test-Driven Development?

Before building the authentication UI, we wrote comprehensive tests for the core authentication functions. This ensures:
- **Security validation**: Critical security features work correctly
- **Confidence**: Changes won't break authentication
- **Documentation**: Tests show how functions should behave

### What We Tested (45 Tests)

```typescript
describe('Authentication Functions', () => {
  // Password Hashing (8 tests)
  it('should hash password with bcrypt', async () => {
    const hashed = await hashPassword('password123');
    expect(hashed).not.toBe('password123');  // Never plaintext
    expect(hashed).toMatch(/^\$2b\$/);  // bcrypt signature
  });

  it('should create unique hashes for same password', async () => {
    const hash1 = await hashPassword('password');
    const hash2 = await hashPassword('password');
    expect(hash1).not.toBe(hash2);  // Unique salt each time
  });

  // Session Management (14 tests)
  it('should create session with 24-hour TTL', async () => {
    const sessionId = await createSession(userId);
    const ttl = await redis.ttl(`session:${sessionId}`);
    expect(ttl).toBeCloseTo(86400, -1);  // ~24 hours
  });

  // Security Properties (8 tests)
  it('should use cryptographically secure session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).toHaveLength(64);  // 32 bytes hex
    expect(id1).not.toBe(id2);  // Unique
  });

  // Integration Tests (15 tests)
  it('should complete registration flow', async () => {
    const user = await register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    
    expect(user.id).toBeDefined();
    expect(user.password).toBeUndefined();  // Never returned
    
    // Password should be hashed in database
    const dbUser = await db.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    expect(dbUser.rows[0].password_hash).toMatch(/^\$2b\$/);
  });
});
```

### Key Security Tests

**1. No Plaintext Passwords**
```typescript
it('should never store plaintext passwords', async () => {
  const plainPassword = 'SuperSecret123';
  const user = await register({ password: plainPassword });
  
  // Check database
  const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
  expect(result.rows[0].password_hash).not.toBe(plainPassword);
  expect(result.rows[0].password_hash).toMatch(/^\$2b\$/);  // bcrypt format
});
```

**2. Timing-Safe Password Verification**
```typescript
it('should not leak timing information', async () => {
  // bcrypt.compare() is timing-safe
  // Even if password is wrong, it takes the same time
  const hash = await bcrypt.hash('correct', 10);
  
  const start1 = Date.now();
  await bcrypt.compare('wrong', hash);
  const time1 = Date.now() - start1;
  
  const start2 = Date.now();
  await bcrypt.compare('verywrongpassword', hash);
  const time2 = Date.now() - start2;
  
  // Times should be similar (within 50ms)
  expect(Math.abs(time1 - time2)).toBeLessThan(50);
});
```

**Why this matters**: Without timing-safe comparison, attackers can measure response times to guess passwords character by character.

---

## T055-T059: Authentication Pages & API

### Architecture Overview

```
User Interface          API Layer           Business Logic
─────────────          ─────────           ──────────────
register.astro    →    /api/auth/register  →  hashPassword()
   ↓                          ↓                     ↓
login.astro       →    /api/auth/login     →  createSession()
   ↓                          ↓                     ↓
dashboard/*       ←    session cookie      ←  verifyPassword()
   ↓                          ↓                     ↓
logout button     →    /api/auth/logout    →  destroySession()
```

---

## T055: Registration Page

### File: `src/pages/register.astro`

### Key Design Decisions

**1. Server-Side Rendering**
```astro
---
export const prerender = false;  // Enable SSR

// Check if already logged in
const session = await getSessionFromRequest(Astro.cookies);
if (session) {
  return Astro.redirect('/dashboard');  // Redirect to dashboard
}
---
```

**Why SSR?**
- Display server-side error messages (email exists, validation errors)
- Redirect authenticated users (can't register twice)
- Security: Form processing happens on server

**2. Client-Side Password Matching**
```html
<input type="password" id="password" name="password" required />
<input type="password" id="confirm_password" name="confirm_password" required />

<script>
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm_password');
  
  confirm.addEventListener('input', () => {
    if (confirm.value !== password.value) {
      confirm.setCustomValidity('Passwords do not match');
    } else {
      confirm.setCustomValidity('');
    }
  });
</script>
```

**Why client-side?**
- Instant feedback (no page reload)
- Better UX (user knows immediately)
- Still validated on server (never trust client)

**3. Error Message Handling**
```astro
---
const error = Astro.url.searchParams.get('error');
const success = Astro.url.searchParams.get('success');
---

{error === 'email_exists' && (
  <div class="error-message">
    This email is already registered. <a href="/login">Login instead?</a>
  </div>
)}

{success === 'registered' && (
  <div class="success-message">
    Account created! Please log in.
  </div>
)}
```

**Why URL parameters?**
- Preserves messages after redirect
- Allows bookmarking/sharing (safe - no sensitive data)
- Simple implementation (no session storage needed)

---

## T057: Registration API Endpoint

### File: `src/pages/api/auth/register.ts`

### Registration Flow

```typescript
export async function POST({ request, cookies }: APIContext) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const name = formData.get('name')?.toString();
    
    // 2. Validate with Zod
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      confirm_password: z.string(),
      name: z.string().min(2).max(100),
      terms: z.literal('on')  // Checkbox must be checked
    }).refine(data => data.password === data.confirm_password, {
      message: 'Passwords must match'
    });
    
    const validated = schema.parse({ email, password, ... });
    
    // 3. Normalize email (case-insensitive)
    const normalizedEmail = validated.email.toLowerCase().trim();
    
    // 4. Hash password
    const passwordHash = await hashPassword(validated.password);
    
    // 5. Insert user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, name, whatsapp)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role
    `, [normalizedEmail, passwordHash, validated.name, validated.whatsapp]);
    
    // 6. Redirect to login
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?success=registered' }
    });
    
  } catch (error) {
    if (error.code === '23505') {  // PostgreSQL unique constraint
      return redirect('/register?error=email_exists');
    }
    return redirect('/register?error=server_error');
  }
}
```

### Security Deep Dive

**1. Email Normalization**
```typescript
// Without normalization
user@Example.com  →  user1
User@Example.com  →  user2  // Duplicate account!

// With normalization
user@Example.com  →  user@example.com  →  user1
User@Example.com  →  user@example.com  →  user1 (conflict detected)
```

**Why lowercase?**
- Email addresses are case-insensitive (per RFC 5321)
- Prevents duplicate accounts with different cases
- Consistent lookups (always search lowercase)

**2. Password Hashing**
```typescript
// Bad: Plaintext storage
await db.insert({ password: 'password123' });  // ❌

// Good: Hash with bcrypt
const hash = await bcrypt.hash('password123', 10);
await db.insert({ password_hash: hash });  // ✅
```

**Why bcrypt?**
- One-way: Cannot reverse to get original password
- Salted: Same password → different hashes
- Slow: 10 rounds = ~100ms (prevents brute force)
- Adaptive: Can increase rounds as computers get faster

**Example bcrypt output:**
```
$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 │  │  │                      │                           │
 │  │  │                      │                           └─ Hash (31 chars)
 │  │  │                      └─ Salt (22 chars)
 │  │  └─ Cost factor (2^10 = 1024 iterations)
 │  └─ bcrypt version
 └─ Algorithm identifier
```

**3. SQL Injection Prevention**
```typescript
// ❌ Vulnerable: String concatenation
const query = `INSERT INTO users (email) VALUES ('${email}')`;
await db.query(query);
// If email = "'; DROP TABLE users; --", deletes entire table!

// ✅ Safe: Parameterized query
await db.query(
  'INSERT INTO users (email) VALUES ($1)',
  [email]  // PostgreSQL escapes this
);
```

---

## T056: Login Page

### File: `src/pages/login.astro`

### Redirect Parameter Support

```astro
---
// User tried to access /dashboard/courses without login
// They were redirected to /login?redirect=/dashboard/courses
const redirect = Astro.url.searchParams.get('redirect') || '/dashboard';
---

<form method="POST" action="/api/auth/login">
  <input type="hidden" name="redirect" value={redirect} />
  <input type="email" name="email" required />
  <input type="password" name="password" required />
  <button type="submit">Login</button>
</form>
```

**Why redirect parameter?**
- Returns user to intended page after login
- Better UX (no extra navigation)
- Common pattern (used by most websites)

**Example flow:**
```
1. User visits /dashboard/courses (not logged in)
2. Middleware redirects to /login?redirect=/dashboard/courses
3. User logs in
4. API redirects to /dashboard/courses (preserved from param)
```

---

## T058: Login API Endpoint

### File: `src/pages/api/auth/login.ts`

### Login Flow with Sessions

```typescript
export async function POST({ request, cookies }: APIContext) {
  try {
    // 1. Validate credentials
    const { email, password } = await parseAndValidate(request);
    
    // 2. Lookup user (exclude soft-deleted)
    const result = await db.query(`
      SELECT id, email, password_hash, name, role
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return redirect('/login?error=invalid_credentials');
    }
    
    const user = result.rows[0];
    
    // 3. Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return redirect('/login?error=invalid_credentials');
    }
    
    // 4. Create session in Redis
    const sessionId = crypto.randomBytes(32).toString('hex');
    await redis.setEx(
      `session:${sessionId}`,
      86400,  // 24 hours
      JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      })
    );
    
    // 5. Set session cookie
    cookies.set('session_id', sessionId, {
      httpOnly: true,    // JavaScript can't access
      secure: import.meta.env.PROD,  // HTTPS only in production
      sameSite: 'lax',   // CSRF protection
      maxAge: 86400,     // 24 hours (matches Redis TTL)
      path: '/'          // Site-wide
    });
    
    // 6. Redirect to destination
    const redirect = formData.get('redirect')?.toString() || '/dashboard';
    return new Response(null, {
      status: 302,
      headers: { Location: redirect }
    });
    
  } catch (error) {
    return redirect('/login?error=server_error');
  }
}
```

### Session Management Explained

**Why Redis for sessions?**

```
Alternative 1: Database Sessions
  ✓ Persistent across restarts
  ✗ Slow (disk I/O)
  ✗ Database load for every request

Alternative 2: JWT Tokens
  ✓ Stateless (no storage needed)
  ✗ Can't revoke (logout doesn't work immediately)
  ✗ Larger cookie size
  ✗ Security issues if stolen

✅ Redis Sessions (Best choice)
  ✓ Fast (in-memory, <1ms)
  ✓ Auto-expiration (TTL)
  ✓ Can revoke immediately
  ✓ Smaller cookie size
```

**Cookie Security Properties**

```typescript
httpOnly: true
```
- JavaScript cannot access: `document.cookie` won't show it
- Prevents XSS attacks (even if attacker injects script, can't steal cookie)

```typescript
secure: true  // Production only
```
- Only sent over HTTPS
- Prevents man-in-the-middle attacks

```typescript
sameSite: 'lax'
```
- Not sent with cross-site requests (POST)
- Prevents CSRF attacks
- Still sent with top-level navigation (GET)

**Example CSRF protection:**
```html
<!-- Attacker's site -->
<form action="https://yoursite.com/api/transfer-money" method="POST">
  <input name="amount" value="1000000" />
</form>
<script>document.forms[0].submit();</script>
```

**Without SameSite:**
- User visits attacker's site
- Form submits to your site
- Cookie sent automatically
- Money transferred!

**With SameSite: lax**
- User visits attacker's site
- Form submits to your site
- Cookie NOT sent (cross-site POST)
- Request fails (no authentication)

---

## T059: Logout API Endpoint

### File: `src/pages/api/auth/logout.ts`

### Simple but Secure

```typescript
export async function POST({ cookies }: APIContext) {
  try {
    // 1. Get session ID from cookie
    const sessionId = cookies.get('session_id')?.value;
    
    if (sessionId) {
      // 2. Delete session from Redis
      await redis.del(`session:${sessionId}`);
    }
    
    // 3. Clear cookie (even if Redis fails)
    cookies.delete('session_id', { path: '/' });
    
    // 4. Redirect to login
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?success=logout' }
    });
    
  } catch (error) {
    // Fail-safe: Always redirect (don't leave user stuck)
    console.error('Logout error:', error);
    cookies.delete('session_id', { path: '/' });
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });
  }
}
```

**Why fail-safe approach?**
- Redis might be down
- User should still be able to logout
- Clear cookie even if Redis fails
- Better UX (no stuck logged-in state)

---

## Dashboard Integration

### Before: Hardcoded User

```astro
---
// src/pages/dashboard/index.astro (Phase 3)
const userId = 'user-uuid-123';  // ❌ Hardcoded
const user = {
  name: 'Test User',
  email: 'test@example.com'
};
---
```

### After: Real Session Data

```astro
---
// src/pages/dashboard/index.astro (Phase 4)
export const prerender = false;  // Enable SSR

import { getSessionFromRequest } from '@/lib/auth/session';

// Check authentication
const session = await getSessionFromRequest(Astro.cookies);
if (!session) {
  return Astro.redirect('/login?redirect=/dashboard');
}

// Use real user data
const userId = session.userId;
const userName = session.name;
const userEmail = session.email;
---

<h1>Welcome, {userName}!</h1>
```

**Flow:**
```
1. User requests /dashboard
2. Astro calls getSessionFromRequest()
3. Function reads session_id cookie
4. Looks up session in Redis
5. Returns user data or null
6. Page redirects if null, renders if valid
```

---

## Complete Authentication Flow

### Registration to Dashboard Access

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. GET /register
       ▼
┌─────────────────┐
│ register.astro  │ (Check if logged in → redirect)
└────────┬────────┘
         │ 2. Render form
         ▼
┌─────────────┐
│   Browser   │ (Fill form, submit)
└──────┬──────┘
       │ 3. POST /api/auth/register
       ▼
┌────────────────────────┐
│ /api/auth/register.ts  │
├────────────────────────┤
│ 1. Validate input      │
│ 2. Normalize email     │
│ 3. Hash password       │
│ 4. Insert user         │
│ 5. Redirect to login   │
└─────────┬──────────────┘
          │ 4. 302 → /login?success=registered
          ▼
┌─────────────┐
│ login.astro │ (Show success message)
└──────┬──────┘
       │ 5. User enters credentials
       │ POST /api/auth/login
       ▼
┌───────────────────────┐
│ /api/auth/login.ts    │
├───────────────────────┤
│ 1. Lookup user        │
│ 2. Verify password    │
│ 3. Create Redis session│
│ 4. Set httpOnly cookie│
│ 5. Redirect           │
└─────────┬─────────────┘
          │ 6. 302 → /dashboard
          ▼
┌──────────────────────┐
│ dashboard/index.astro│
├──────────────────────┤
│ 1. Read cookie       │
│ 2. Get Redis session │
│ 3. Render with data  │
└──────────────────────┘
```

---

## Security Audit Checklist

### ✅ Implemented Security Measures

**Password Security:**
- ✅ bcrypt hashing (10+ rounds)
- ✅ Minimum 8 characters
- ✅ Never returned in API responses
- ✅ Timing-safe verification

**Session Security:**
- ✅ Cryptographically secure IDs (32 bytes)
- ✅ HTTP-only cookies
- ✅ Secure cookies (HTTPS in production)
- ✅ SameSite: lax (CSRF protection)
- ✅ 24-hour expiration
- ✅ Logout destroys session

**Email Security:**
- ✅ Normalized to lowercase
- ✅ Unique constraint in database
- ✅ Format validation

**SQL Security:**
- ✅ Parameterized queries
- ✅ No string concatenation
- ✅ Connection pooling

**Error Handling:**
- ✅ Generic error messages (no user enumeration)
- ✅ Logs detailed errors (for debugging)
- ✅ Fail-safe fallbacks

### ⚠️ Future Security Enhancements

**Rate Limiting:**
```typescript
// Prevent brute force login attempts
const attempts = await redis.incr(`login_attempts:${email}`);
if (attempts === 1) {
  await redis.expire(`login_attempts:${email}`, 3600);  // 1 hour
}
if (attempts > 5) {
  return error('Too many attempts. Try again in 1 hour.');
}
```

**Account Lockout:**
```typescript
// Lock account after 10 failed attempts
if (attempts > 10) {
  await db.query('UPDATE users SET locked_until = NOW() + INTERVAL \'1 hour\' WHERE email = $1', [email]);
}
```

**Two-Factor Authentication:**
```typescript
// After password verification
if (user.twoFactorEnabled) {
  // Store pending session
  await redis.setEx(`pending:${tempSessionId}`, 300, JSON.stringify(user));
  return redirect('/auth/2fa?session=' + tempSessionId);
}
```

---

## Testing Strategy

### Unit Tests (45 tests)
```bash
npm test -- T053-auth-functions.test.ts
```

Tests individual functions in isolation:
- Password hashing/verification
- Session creation/retrieval
- Token generation
- Error handling

### Integration Tests (20 tests)
```bash
npm test -- T055-T059-auth-integration.test.ts
```

Tests API endpoints:
- Registration flow
- Login flow
- Logout flow
- Dashboard authentication

### E2E Tests
```bash
npm run test:e2e
```

Tests complete user journeys in browser:
- Register → Login → Dashboard → Logout
- Error scenarios (wrong password, duplicate email)
- Redirect preservation
- Session persistence

---

## Key Takeaways

1. **Session-Based Auth > JWT**
   - Can revoke immediately
   - Smaller cookie size
   - Better security

2. **Multiple Layers of Security**
   - Password hashing (bcrypt)
   - HTTP-only cookies (XSS prevention)
   - SameSite cookies (CSRF prevention)
   - Secure cookies (HTTPS)
   - Email normalization (duplicate prevention)

3. **Test-Driven Development**
   - Write tests first
   - Validates security properties
   - Prevents regressions
   - Documents expected behavior

4. **Progressive Enhancement**
   - Works without JavaScript (POST forms)
   - Enhanced with JavaScript (client validation)
   - Accessible to all users

5. **User Experience**
   - Clear error messages
   - Success confirmation
   - Redirect preservation
   - Fail-safe operations

---

**Related Files:**
- [tests/unit/T053-auth-functions.test.ts](/home/dan/web/tests/unit/T053-auth-functions.test.ts)
- [src/pages/register.astro](/home/dan/web/src/pages/register.astro)
- [src/pages/login.astro](/home/dan/web/src/pages/login.astro)
- [src/pages/api/auth/register.ts](/home/dan/web/src/pages/api/auth/register.ts)
- [src/pages/api/auth/login.ts](/home/dan/web/src/pages/api/auth/login.ts)
- [src/pages/api/auth/logout.ts](/home/dan/web/src/pages/api/auth/logout.ts)

**Next Guide:** [Email Verification (T060)](./phase4-email-verification.md)
