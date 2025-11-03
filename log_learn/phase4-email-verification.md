# Phase 4: Email Verification (T060)

## Overview

Email verification ensures users own the email addresses they register with. This prevents impersonation, spam, and improves account security. Our implementation uses cryptographically secure tokens with time-based expiration.

---

## Why Email Verification?

### Problems Without Verification

**1. Account Takeover**
```
Attacker registers: victim@company.com
Victim can't register (email taken)
Attacker can reset password (email not verified)
```

**2. Spam and Abuse**
```
Spammer registers: random@gmail.com
Never verifies email
Creates 100 accounts
Sends spam through platform
```

**3. Typos**
```
User intends: john@example.com
User types: john@exmaple.com
Can't receive important emails
No way to recover account
```

### Benefits With Verification

- ✅ Proves email ownership
- ✅ Prevents account takeover
- ✅ Reduces spam accounts
- ✅ Catches typos early
- ✅ Builds trust (verified badge)

---

## Architecture Overview

```
Registration Flow:
┌──────────┐
│  User    │
│ Registers│
└────┬─────┘
     │
     ▼
┌────────────────────┐
│  /api/auth/register│
│  1. Create user    │
│  2. Generate token │
│  3. Send email     │
└────┬───────────────┘
     │
     ▼
┌─────────────────────┐
│  Email with link:   │
│  /auth/verify?token=│
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│  User clicks link   │
│  /api/auth/verify   │
│  1. Check token     │
│  2. Mark verified   │
│  3. Clear token     │
└─────────────────────┘
```

---

## Database Schema Changes

### Migration: `003_email_verification.sql`

```sql
-- Add email verification fields to users table
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN verification_token_expires_at TIMESTAMPTZ;

-- Index for fast token lookup
CREATE INDEX idx_users_verification_token 
ON users(verification_token)
WHERE verification_token IS NOT NULL;

-- Index for expired token cleanup
CREATE INDEX idx_users_verification_expires
ON users(verification_token_expires_at)
WHERE verification_token_expires_at IS NOT NULL;
```

### Why These Fields?

**`email_verified` (BOOLEAN)**
```typescript
// Check if user verified
if (!user.email_verified) {
  return error('Please verify your email');
}

// Display badge in UI
{user.email_verified && <VerifiedBadge />}
```

**`verification_token` (VARCHAR(255))**
```typescript
// Store the verification token
// Format: 64 hex characters (32 bytes)
// Example: "a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6..."
```

**Why 32 bytes?**
- 2^256 possible values (more than atoms in universe)
- Impossible to guess
- No collisions

**`verification_token_expires_at` (TIMESTAMPTZ)**
```typescript
// Token valid for 24 hours
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// Check if expired
if (new Date() > user.verification_token_expires_at) {
  return error('Token expired. Request a new one.');
}
```

**Why 24 hours?**
- Long enough for users to check email
- Short enough to prevent abuse
- Can be adjusted based on analytics

---

## Token Generation

### File: `src/lib/auth/verification.ts`

### Cryptographically Secure Tokens

```typescript
import crypto from 'node:crypto';

export function generateVerificationToken(): string {
  // 32 bytes = 256 bits of randomness
  return crypto.randomBytes(32).toString('hex');  // 64 hex characters
}
```

### Why crypto.randomBytes?

**❌ Insecure Random:**
```typescript
// Math.random() is NOT cryptographically secure
const token = Math.random().toString(36);
// Predictable! Attacker can guess next values
```

**✅ Secure Random:**
```typescript
// crypto.randomBytes() uses system entropy
const token = crypto.randomBytes(32).toString('hex');
// Unpredictable! Based on system noise, timing, hardware
```

**Example Entropy Sources:**
- Mouse movements
- Keyboard timing
- Network packet timing
- CPU temperature variations
- System interrupts

### Token Format Comparison

```typescript
// 16 bytes (weak)
"a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6"  // 2^128 values

// 32 bytes (strong) ✅
"a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"  // 2^256 values
```

**Attack Comparison:**
- 16 bytes: 3.4 × 10^38 combinations
- 32 bytes: 1.1 × 10^77 combinations (more than atoms in observable universe!)

---

## Token Expiration Utility

```typescript
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;  // No expiration = expired
  return new Date() > expiresAt;
}
```

### Why Check Expiration?

**Security:**
```typescript
// Without expiration
User registers: 2023-01-01
Token generated: abc123...
User never verifies
Token valid forever
Attacker finds token in 2025: ✓ Still works! ❌
```

**With expiration:**
```typescript
User registers: 2023-01-01
Token generated: abc123... (expires 2023-01-02)
User never verifies
Attacker finds token in 2025: ✗ Expired! ✅
```

---

## Verification Endpoint

### File: `src/pages/api/auth/verify-email.ts`

### Complete Verification Flow

```typescript
import { db } from '@/lib/db';
import { isTokenExpired } from '@/lib/auth/verification';

export async function GET({ url }: APIContext) {
  try {
    // 1. Extract token from URL
    const token = url.searchParams.get('token');
    if (!token) {
      return redirect('/login?error=invalid_token');
    }
    
    // 2. Lookup user with this token
    const result = await db.query(`
      SELECT 
        id, 
        email, 
        email_verified,
        verification_token_expires_at
      FROM users
      WHERE verification_token = $1
        AND deleted_at IS NULL
    `, [token]);
    
    if (result.rows.length === 0) {
      return redirect('/login?error=invalid_token');
    }
    
    const user = result.rows[0];
    
    // 3. Check if already verified
    if (user.email_verified) {
      return redirect('/login?success=already_verified');
    }
    
    // 4. Check expiration
    if (isTokenExpired(user.verification_token_expires_at)) {
      return redirect('/login?error=token_expired');
    }
    
    // 5. Mark as verified and clear token
    await db.query(`
      UPDATE users
      SET 
        email_verified = TRUE,
        verification_token = NULL,
        verification_token_expires_at = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [user.id]);
    
    // 6. Redirect to login with success message
    return redirect('/login?success=email_verified');
    
  } catch (error) {
    console.error('Email verification error:', error);
    return redirect('/login?error=verification_failed');
  }
}
```

### Security Considerations

**1. Constant-Time Token Lookup**
```typescript
// ❌ Timing attack vulnerable
for (const user of allUsers) {
  if (user.token === providedToken) return user;
}
// Faster to find existing token vs non-existing

// ✅ Database index provides constant-time lookup
const result = await db.query('SELECT * FROM users WHERE verification_token = $1', [token]);
// Same speed whether token exists or not
```

**2. Single-Use Tokens**
```typescript
// After successful verification
UPDATE users
SET 
  verification_token = NULL,  // Clear token
  verification_token_expires_at = NULL
WHERE id = $1;

// Token can't be reused
```

**3. No User Enumeration**
```typescript
// ❌ Reveals information
if (!user) {
  return error('User not found');  // User doesn't exist
}
if (user.email_verified) {
  return error('Already verified');  // User exists, already verified
}

// ✅ Generic message
if (!user || user.email_verified) {
  return redirect('/login?error=invalid_token');  // Same message
}
```

**Why this matters:**
Attacker can't use verification endpoint to check if email is registered.

---

## Resend Verification Endpoint

### File: `src/pages/api/auth/resend-verification.ts`

### When Users Need to Resend

- Email went to spam
- Email expired before checking
- Typo in email (need to update first)
- Email service was down

### Implementation

```typescript
export async function POST({ request, cookies }: APIContext) {
  try {
    // 1. Must be logged in to resend
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      return redirect('/login?error=not_authenticated');
    }
    
    // 2. Get user data
    const result = await db.query(`
      SELECT id, email, email_verified
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `, [session.userId]);
    
    if (result.rows.length === 0) {
      return redirect('/login?error=user_not_found');
    }
    
    const user = result.rows[0];
    
    // 3. Check if already verified
    if (user.email_verified) {
      return redirect('/dashboard?info=already_verified');
    }
    
    // 4. Generate new token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);  // 24 hours
    
    // 5. Update database
    await db.query(`
      UPDATE users
      SET 
        verification_token = $1,
        verification_token_expires_at = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [token, expiresAt, user.id]);
    
    // 6. Send email
    await sendVerificationEmail(user.email, token);
    
    // 7. Success response
    return redirect('/dashboard?success=verification_sent');
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return redirect('/dashboard?error=resend_failed');
  }
}
```

### Rate Limiting (Future Enhancement)

```typescript
// Prevent email spam
const key = `resend_verification:${session.userId}`;
const attempts = await redis.incr(key);

if (attempts === 1) {
  await redis.expire(key, 3600);  // 1 hour window
}

if (attempts > 3) {
  return error('Too many requests. Try again in 1 hour.');
}
```

**Why rate limit?**
- Prevents email flooding
- Reduces server load
- Protects email service reputation

---

## Email Templates

### File: `src/lib/email/templates.ts`

### HTML Email

```typescript
export function verificationEmailHTML(token: string): string {
  const verifyUrl = `${import.meta.env.PUBLIC_SITE_URL}/api/auth/verify-email?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verify Your Email</h1>
          <p>Thanks for signing up! Click the button below to verify your email address:</p>
          
          <a href="${verifyUrl}" class="button">Verify Email</a>
          
          <p>Or copy and paste this link:</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          
          <div class="footer">
            <p>This link expires in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
```

### Plain Text Email

```typescript
export function verificationEmailText(token: string): string {
  const verifyUrl = `${import.meta.env.PUBLIC_SITE_URL}/api/auth/verify-email?token=${token}`;
  
  return `
Verify Your Email

Thanks for signing up! Click the link below to verify your email address:

${verifyUrl}

This link expires in 24 hours.

If you didn't create an account, please ignore this email.
  `.trim();
}
```

### Why Both HTML and Plain Text?

**HTML Email:**
- Pretty formatting
- Clickable buttons
- Better UX

**Plain Text Email:**
- Some email clients block HTML
- Screen readers prefer plain text
- Spam filters like plain text fallback
- Better deliverability

**Email Client Support:**
```typescript
// Nodemailer automatically sends both
await sendMail({
  html: verificationEmailHTML(token),  // Preferred
  text: verificationEmailText(token)   // Fallback
});
```

---

## Integration with Registration

### Updated Registration Flow

```typescript
// src/pages/api/auth/register.ts

export async function POST({ request }: APIContext) {
  // ... validation and user creation ...
  
  // Generate verification token
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Insert user with token
  const result = await db.query(`
    INSERT INTO users (
      email, 
      password_hash, 
      name,
      verification_token,
      verification_token_expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, name
  `, [email, passwordHash, name, token, expiresAt]);
  
  const user = result.rows[0];
  
  // Send verification email
  try {
    await sendVerificationEmail(user.email, token);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't fail registration if email fails
    // User can resend later
  }
  
  return redirect('/login?success=registered&verify=pending');
}
```

### Why Not Block Registration on Email Failure?

**User Experience:**
```typescript
// ❌ Bad: Fails registration
try {
  await sendEmail();
} catch (error) {
  return error('Registration failed. Try again.');
}
// User loses entered data
// Has to re-register

// ✅ Good: Allows registration
try {
  await sendEmail();
} catch (error) {
  console.error('Email failed:', error);
  // User still registered
  // Can resend from dashboard
}
```

**Reliability:**
- Email service might be temporarily down
- Network issues
- Quota exceeded
- User can always resend

---

## Integration with Profile Updates

### Email Change Requires Re-verification

```typescript
// src/pages/api/dashboard/profile.ts

export async function POST({ request, cookies }: APIContext) {
  const session = await getSessionFromRequest(cookies);
  const newEmail = formData.get('email');
  
  // Get current email
  const result = await db.query('SELECT email FROM users WHERE id = $1', [session.userId]);
  const currentEmail = result.rows[0].email;
  
  // If email changed, require re-verification
  if (newEmail !== currentEmail) {
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.query(`
      UPDATE users
      SET 
        email = $1,
        email_verified = FALSE,  -- Unverify
        verification_token = $2,
        verification_token_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [newEmail, token, expiresAt, session.userId]);
    
    await sendVerificationEmail(newEmail, token);
    
    return redirect('/dashboard/profile?success=email_updated&verify=pending');
  }
  
  // Email unchanged, no verification needed
  // ... update other fields ...
}
```

### Why Re-verify on Email Change?

**Security Scenario:**
```
1. Attacker gains access to user's account (stolen password)
2. Attacker changes email to attacker@evil.com
3. Attacker clicks "forgot password"
4. Reset link goes to attacker@evil.com
5. Attacker resets password
6. Victim locked out permanently
```

**With re-verification:**
```
1. Attacker gains access to user's account
2. Attacker changes email to attacker@evil.com
3. Verification email sent to attacker@evil.com
4. BUT: Account still uses old email (unverified)
5. Victim receives "email change" notification to old email
6. Victim can login with old email, revert change
```

---

## Optional vs Required Verification

### Current Implementation: Optional

```typescript
// Users can login without verifying
export async function POST({ request, cookies }: APIContext) {
  const user = await findUser(email);
  const isValid = await verifyPassword(password, user.password_hash);
  
  if (isValid) {
    await createSession(user.id);
    return redirect('/dashboard');  // ✓ No verification check
  }
}
```

### Making Verification Required

```typescript
// Block unverified users from sensitive actions
export async function POST({ request, cookies }: APIContext) {
  const user = await findUser(email);
  const isValid = await verifyPassword(password, user.password_hash);
  
  if (!isValid) {
    return error('Invalid credentials');
  }
  
  // Check verification
  if (!user.email_verified) {
    return redirect('/verify-email-prompt?email=' + encodeURIComponent(user.email));
  }
  
  await createSession(user.id);
  return redirect('/dashboard');
}
```

### Trade-offs

**Optional Verification:**
- ✅ Better signup conversion (fewer steps)
- ✅ Users can explore immediately
- ✅ Less friction
- ⚠️ Allows spam accounts
- ⚠️ Unverified emails might be typos

**Required Verification:**
- ✅ Guarantees email ownership
- ✅ Reduces spam
- ✅ Catches typos early
- ⚠️ Lower signup conversion
- ⚠️ More support requests (email issues)

### Hybrid Approach (Recommended)

```typescript
// Allow login, restrict features
export async function POST({ request, cookies }: APIContext) {
  const user = await findUser(email);
  
  if (!user.email_verified) {
    await createSession(user.id);
    // Redirect to dashboard with banner
    return redirect('/dashboard?warning=email_not_verified');
  }
  
  await createSession(user.id);
  return redirect('/dashboard');
}

// Restrict certain features
export async function purchaseCourse({ session }: APIContext) {
  const user = await getUser(session.userId);
  
  if (!user.email_verified) {
    return error('Please verify your email before purchasing');
  }
  
  // ... proceed with purchase ...
}
```

**Best of both:**
- Users can explore without verification
- Important actions require verification
- Gentle nudges to verify

---

## Testing Strategy

### Unit Tests (14 Tests)

```typescript
describe('Email Verification', () => {
  describe('Token Generation', () => {
    it('should generate 64-character hex token', () => {
      const token = generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
    
    it('should generate unique tokens', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });
  
  describe('Token Expiration', () => {
    it('should detect expired tokens', () => {
      const past = new Date(Date.now() - 1000);
      expect(isTokenExpired(past)).toBe(true);
    });
    
    it('should detect valid tokens', () => {
      const future = new Date(Date.now() + 1000);
      expect(isTokenExpired(future)).toBe(false);
    });
  });
  
  describe('Verification Endpoint', () => {
    it('should verify valid token', async () => {
      const user = await createTestUser({ email_verified: false });
      const token = generateVerificationToken();
      await setVerificationToken(user.id, token);
      
      const response = await GET({ url: new URL(`?token=${token}`, 'http://test') });
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('success=email_verified');
      
      const verified = await getUser(user.id);
      expect(verified.email_verified).toBe(true);
      expect(verified.verification_token).toBeNull();
    });
    
    it('should reject expired token', async () => {
      const user = await createTestUser({ email_verified: false });
      const token = generateVerificationToken();
      const expiredDate = new Date(Date.now() - 1000);
      await setVerificationToken(user.id, token, expiredDate);
      
      const response = await GET({ url: new URL(`?token=${token}`, 'http://test') });
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('error=token_expired');
    });
  });
});
```

---

## Security Best Practices

### ✅ Implemented

1. **Cryptographically Secure Tokens**
   - 32 bytes from crypto.randomBytes
   - 2^256 possible values
   - Unpredictable

2. **Time-Based Expiration**
   - 24-hour window
   - Prevents stale token reuse
   - Automatic cleanup

3. **Single-Use Tokens**
   - Cleared after verification
   - Can't be replayed

4. **No User Enumeration**
   - Generic error messages
   - Same response for invalid/expired

5. **Database Indexes**
   - Fast token lookup
   - Constant-time verification

### 🔄 Future Enhancements

1. **Rate Limiting**
   ```typescript
   // Prevent token abuse
   const attempts = await redis.incr(`verify:${ip}`);
   if (attempts > 10) return error('Too many attempts');
   ```

2. **Token Cleanup Job**
   ```typescript
   // Daily cron job
   await db.query(`
     DELETE FROM users
     WHERE email_verified = FALSE
       AND created_at < NOW() - INTERVAL '7 days'
   `);
   ```

3. **Email Change Notifications**
   ```typescript
   // Alert old email when changed
   await sendEmail(oldEmail, {
     subject: 'Email Address Changed',
     body: 'Your email was changed. If not you, contact support.'
   });
   ```

---

## Common Issues & Solutions

### Issue 1: Email Not Received

**Possible Causes:**
- Spam folder
- Email service down
- Invalid email address
- Typo in email

**Solution:**
```typescript
// Resend button on dashboard
<form action="/api/auth/resend-verification" method="POST">
  <button type="submit">Resend Verification Email</button>
</form>
```

### Issue 2: Token Expired

**Possible Causes:**
- User checked email >24 hours later
- Email delayed

**Solution:**
```typescript
// Show resend button on error page
if (error === 'token_expired') {
  return (
    <div>
      <p>Verification link expired.</p>
      <a href="/dashboard">Go to dashboard to resend</a>
    </div>
  );
}
```

### Issue 3: Email Service Quota Exceeded

**Solution:**
```typescript
// Queue emails instead of sending immediately
await redis.lpush('email_queue', JSON.stringify({
  to: user.email,
  subject: 'Verify Email',
  html: verificationEmailHTML(token)
}));

// Separate worker processes queue
// Retry with exponential backoff
```

---

## Key Takeaways

1. **Cryptographic Security Matters**
   - Use crypto.randomBytes (not Math.random)
   - 32 bytes minimum for tokens
   - Time-based expiration

2. **User Experience Balance**
   - Optional verification for exploration
   - Required for sensitive actions
   - Easy resend mechanism

3. **Email Reliability**
   - Don't block registration on email failure
   - Provide fallback mechanisms
   - Clear error messages

4. **Security Without User Enumeration**
   - Generic error messages
   - Same response times
   - No information leakage

5. **Integration Points**
   - Registration creates token
   - Profile updates re-verify
   - Dashboard shows status

---

**Related Files:**
- [migrations/003_email_verification.sql](/home/dan/web/migrations/003_email_verification.sql)
- [src/lib/auth/verification.ts](/home/dan/web/src/lib/auth/verification.ts)
- [src/pages/api/auth/verify-email.ts](/home/dan/web/src/pages/api/auth/verify-email.ts)
- [src/pages/api/auth/resend-verification.ts](/home/dan/web/src/pages/api/auth/resend-verification.ts)
- [src/lib/email/templates.ts](/home/dan/web/src/lib/email/templates.ts)

**Previous Guide:** [Authentication System (T053-T059)](./phase4-authentication.md)
**Next Guide:** [Profile Management (T061-T062)](./phase4-profile-management.md)
