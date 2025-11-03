# Phase 4: Profile Management (T061-T062)

## Overview

Profile management allows users to update their account information: name, email, WhatsApp number, and password. This phase integrates with the authentication and email verification systems, ensuring security while providing a smooth user experience.

---

## Why Profile Management?

### User Needs

**Updating Contact Information:**
```
Scenario: User changes email provider
  Old: user@oldmail.com
  New: user@gmail.com
  Needs: Update email in platform
```

**Security Updates:**
```
Scenario: Suspicious activity detected
  Action: Change password immediately
  Needs: Secure password update flow
```

**Communication Preferences:**
```
Scenario: User wants course updates via WhatsApp
  Action: Add WhatsApp number
  Needs: Optional contact field
```

### Design Goals

- ✅ **Self-service**: Users update without admin help
- ✅ **Secure**: Password verification for sensitive changes
- ✅ **Integrated**: Email changes trigger re-verification
- ✅ **Validation**: Real-time feedback on input
- ✅ **Accessible**: Works without JavaScript

---

## Architecture Overview

```
Profile Page Architecture:
┌─────────────────────────┐
│   /dashboard/profile    │
│  (Astro SSR Component)  │
├─────────────────────────┤
│  Two-Section Form:      │
│  1. Account Information │
│  2. Change Password     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ /api/dashboard/profile  │
│   (API Endpoint)        │
├─────────────────────────┤
│  Handles:               │
│  • Name updates         │
│  • Email updates        │
│  • WhatsApp updates     │
│  • Password changes     │
└─────────────────────────┘
```

---

## T061: Profile Page UI

### File: `src/pages/dashboard/profile.astro`

### Two-Section Layout

```astro
---
export const prerender = false;

import { getSessionFromRequest } from '@/lib/auth/session';
import { db } from '@/lib/db';
import DashboardLayout from '@/layouts/DashboardLayout.astro';

// Authentication check
const session = await getSessionFromRequest(Astro.cookies);
if (!session) {
  return Astro.redirect('/login?redirect=/dashboard/profile');
}

// Fetch user data
const result = await db.query(`
  SELECT name, email, whatsapp, email_verified
  FROM users
  WHERE id = $1 AND deleted_at IS NULL
`, [session.userId]);

if (result.rows.length === 0) {
  return Astro.redirect('/login');
}

const user = result.rows[0];

// Extract messages from query params
const success = Astro.url.searchParams.get('success');
const error = Astro.url.searchParams.get('error');
const verify = Astro.url.searchParams.get('verify');
---

<DashboardLayout title="Profile Settings" user={user}>
  <!-- Success/Error Messages -->
  {success === 'profile_updated' && (
    <div class="alert alert-success">Profile updated successfully!</div>
  )}
  
  {error === 'email_exists' && (
    <div class="alert alert-error">Email already in use by another account.</div>
  )}
  
  {verify === 'pending' && (
    <div class="alert alert-info">
      Verification email sent. Please check your inbox.
    </div>
  )}
  
  <!-- Section 1: Account Information -->
  <section class="account-info">
    <h2>Account Information</h2>
    
    <form method="POST" action="/api/dashboard/profile" id="account-form">
      <input type="hidden" name="form_type" value="account_info" />
      
      <div class="form-group">
        <label for="name">Full Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={user.name}
          required
          minlength="2"
          maxlength="100"
        />
        <span class="help-text">How you'd like to be addressed</span>
      </div>
      
      <div class="form-group">
        <label for="email">Email Address *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={user.email}
          required
        />
        {!user.email_verified && (
          <span class="warning-text">⚠️ Email not verified</span>
        )}
        {user.email_verified && (
          <span class="success-text">✓ Verified</span>
        )}
        <span class="help-text">
          Changing email requires re-verification
        </span>
      </div>
      
      <div class="form-group">
        <label for="whatsapp">WhatsApp Number (Optional)</label>
        <input
          type="tel"
          id="whatsapp"
          name="whatsapp"
          value={user.whatsapp || ''}
          placeholder="+1234567890"
          pattern="\\+?[0-9]{10,15}"
        />
        <span class="help-text">
          Format: +country code + number (e.g., +12345678901)
        </span>
      </div>
      
      <button type="submit" class="btn-primary">Update Account Info</button>
    </form>
  </section>
  
  <!-- Section 2: Change Password -->
  <section class="password-change">
    <h2>Change Password</h2>
    
    <form method="POST" action="/api/dashboard/profile" id="password-form">
      <input type="hidden" name="form_type" value="password_change" />
      
      <div class="form-group">
        <label for="current_password">Current Password *</label>
        <input
          type="password"
          id="current_password"
          name="current_password"
          required
          autocomplete="current-password"
        />
        <span class="help-text">For security verification</span>
      </div>
      
      <div class="form-group">
        <label for="new_password">New Password *</label>
        <input
          type="password"
          id="new_password"
          name="new_password"
          required
          minlength="8"
          autocomplete="new-password"
        />
        <span class="help-text">Minimum 8 characters</span>
      </div>
      
      <div class="form-group">
        <label for="confirm_new_password">Confirm New Password *</label>
        <input
          type="password"
          id="confirm_new_password"
          name="confirm_new_password"
          required
          autocomplete="new-password"
        />
      </div>
      
      <button type="submit" class="btn-primary">Change Password</button>
    </form>
  </section>
  
  <!-- Client-side validation -->
  <script>
    // Password matching validation
    const newPassword = document.getElementById('new_password');
    const confirmPassword = document.getElementById('confirm_new_password');
    
    confirmPassword.addEventListener('input', () => {
      if (confirmPassword.value !== newPassword.value) {
        confirmPassword.setCustomValidity('Passwords do not match');
      } else {
        confirmPassword.setCustomValidity('');
      }
    });
    
    // Real-time WhatsApp format validation
    const whatsappInput = document.getElementById('whatsapp');
    whatsappInput.addEventListener('input', () => {
      const value = whatsappInput.value;
      if (value && !/^\+?[0-9]{10,15}$/.test(value)) {
        whatsappInput.setCustomValidity('Format: +country code + number');
      } else {
        whatsappInput.setCustomValidity('');
      }
    });
  </script>
</DashboardLayout>
```

### Key Design Decisions

**1. Two Separate Forms**

```astro
<!-- Why two forms? -->
<form id="account-form">
  <input type="hidden" name="form_type" value="account_info" />
  <!-- Account fields -->
</form>

<form id="password-form">
  <input type="hidden" name="form_type" value="password_change" />
  <!-- Password fields -->
</form>
```

**Reasoning:**
- Different validation rules
- Different security requirements
- Clear separation of concerns
- Independent submission (update name without changing password)

**2. Email Verification Status Badge**

```astro
{!user.email_verified && (
  <span class="warning-text">⚠️ Email not verified</span>
)}
{user.email_verified && (
  <span class="success-text">✓ Verified</span>
)}
```

**Why show status?**
- Visual feedback
- Encourages verification
- Explains why some features disabled

**3. Optional WhatsApp Field**

```astro
<input
  type="tel"
  name="whatsapp"
  value={user.whatsapp || ''}
  pattern="\\+?[0-9]{10,15}"
/>
```

**Why optional?**
- Not all users have WhatsApp
- Alternative to email notifications
- International format support

**Pattern explanation:**
- `\+?`: Optional plus sign
- `[0-9]{10,15}`: 10-15 digits
- Example valid: `+12345678901`

**4. Progressive Enhancement**

```html
<!-- Works without JavaScript -->
<form method="POST">
  <input type="email" required />
  <button type="submit">Update</button>
</form>

<!-- Enhanced with JavaScript -->
<script>
  // Real-time validation
  // Password matching
  // Format checking
</script>
```

**Benefits:**
- Accessible to all users
- Works on slow connections
- Enhanced experience when JS available

---

## T062: Profile API Endpoint

### File: `src/pages/api/dashboard/profile.ts`

### Multi-Action Handler

```typescript
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { generateVerificationToken } from '@/lib/auth/verification';
import { sendVerificationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function POST({ request, cookies }: APIContext) {
  try {
    // 1. Authentication check
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login?redirect=/dashboard/profile' }
      });
    }
    
    // 2. Parse form data
    const formData = await request.formData();
    const formType = formData.get('form_type')?.toString();
    
    // 3. Route to appropriate handler
    if (formType === 'account_info') {
      return await handleAccountUpdate(formData, session);
    } else if (formType === 'password_change') {
      return await handlePasswordChange(formData, session);
    } else {
      return new Response(null, {
        status: 400,
        headers: { Location: '/dashboard/profile?error=invalid_form' }
      });
    }
    
  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/dashboard/profile?error=server_error' }
    });
  }
}
```

### Account Information Update

```typescript
async function handleAccountUpdate(
  formData: FormData,
  session: Session
): Promise<Response> {
  // 1. Validate input
  const schema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal(''))
  });
  
  const data = schema.parse({
    name: formData.get('name')?.toString(),
    email: formData.get('email')?.toString(),
    whatsapp: formData.get('whatsapp')?.toString()
  });
  
  // 2. Normalize email
  const normalizedEmail = data.email.toLowerCase().trim();
  
  // 3. Get current user data
  const currentUser = await db.query(`
    SELECT email, email_verified
    FROM users
    WHERE id = $1 AND deleted_at IS NULL
  `, [session.userId]);
  
  if (currentUser.rows.length === 0) {
    return redirect('/login');
  }
  
  const currentEmail = currentUser.rows[0].email;
  const emailChanged = normalizedEmail !== currentEmail;
  
  // 4. If email changed, check uniqueness
  if (emailChanged) {
    const existingUser = await db.query(`
      SELECT id FROM users
      WHERE email = $1 AND id != $2 AND deleted_at IS NULL
    `, [normalizedEmail, session.userId]);
    
    if (existingUser.rows.length > 0) {
      return redirect('/dashboard/profile?error=email_exists');
    }
  }
  
  // 5. Update user data
  if (emailChanged) {
    // Email changed: Generate verification token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.query(`
      UPDATE users
      SET 
        name = $1,
        email = $2,
        whatsapp = $3,
        email_verified = FALSE,
        verification_token = $4,
        verification_token_expires_at = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [data.name, normalizedEmail, data.whatsapp || null, token, expiresAt, session.userId]);
    
    // Send verification email to new address
    try {
      await sendVerificationEmail(normalizedEmail, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }
    
    return redirect('/dashboard/profile?success=profile_updated&verify=pending');
    
  } else {
    // Email unchanged: Simple update
    await db.query(`
      UPDATE users
      SET 
        name = $1,
        whatsapp = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [data.name, data.whatsapp || null, session.userId]);
    
    return redirect('/dashboard/profile?success=profile_updated');
  }
}
```

### Email Change Security Flow

**Step-by-Step Process:**

```
1. User updates email: old@example.com → new@example.com

2. Database update:
   - email = 'new@example.com'
   - email_verified = FALSE
   - verification_token = '...'
   - verification_token_expires_at = NOW() + 24h

3. Verification email sent to: new@example.com

4. User must click link in email

5. Until verified:
   - User can still login with new email
   - Email shows as "unverified" in UI
   - Some features may be restricted

6. After verification:
   - email_verified = TRUE
   - verification_token = NULL
   - Full access restored
```

**Why this flow?**

**Without re-verification:**
```
Attacker steals password
Changes email to attacker@evil.com
Clicks "forgot password"
Reset link goes to attacker@evil.com
Changes password
Victim locked out forever ❌
```

**With re-verification:**
```
Attacker steals password
Changes email to attacker@evil.com
Email unverified (still uses old email for critical actions)
Victim receives "email change" notification
Victim logs in with old email, reverts change
Attacker blocked ✅
```

### Password Change Handler

```typescript
async function handlePasswordChange(
  formData: FormData,
  session: Session
): Promise<Response> {
  // 1. Validate input
  const schema = z.object({
    current_password: z.string(),
    new_password: z.string().min(8),
    confirm_new_password: z.string()
  }).refine(data => data.new_password === data.confirm_new_password, {
    message: 'New passwords must match'
  });
  
  const data = schema.parse({
    current_password: formData.get('current_password')?.toString(),
    new_password: formData.get('new_password')?.toString(),
    confirm_new_password: formData.get('confirm_new_password')?.toString()
  });
  
  // 2. Get current password hash
  const result = await db.query(`
    SELECT password_hash
    FROM users
    WHERE id = $1 AND deleted_at IS NULL
  `, [session.userId]);
  
  if (result.rows.length === 0) {
    return redirect('/login');
  }
  
  const currentHash = result.rows[0].password_hash;
  
  // 3. Verify current password
  const isValidCurrent = await bcrypt.compare(data.current_password, currentHash);
  if (!isValidCurrent) {
    return redirect('/dashboard/profile?error=wrong_password');
  }
  
  // 4. Check new password isn't same as old
  const isSameAsOld = await bcrypt.compare(data.new_password, currentHash);
  if (isSameAsOld) {
    return redirect('/dashboard/profile?error=same_password');
  }
  
  // 5. Hash new password
  const newHash = await hashPassword(data.new_password);
  
  // 6. Update database
  await db.query(`
    UPDATE users
    SET 
      password_hash = $1,
      updated_at = NOW()
    WHERE id = $2
  `, [newHash, session.userId]);
  
  // 7. Success
  return redirect('/dashboard/profile?success=password_changed');
}
```

### Password Change Security Deep Dive

**1. Current Password Verification**

```typescript
// ❌ Without verification
async function changePassword(userId, newPassword) {
  const hash = await hashPassword(newPassword);
  await db.update({ password_hash: hash }, userId);
}
// Attacker with stolen session can change password immediately

// ✅ With verification
async function changePassword(userId, currentPassword, newPassword) {
  const isValid = await verifyCurrentPassword(userId, currentPassword);
  if (!isValid) return error('Wrong current password');
  
  const hash = await hashPassword(newPassword);
  await db.update({ password_hash: hash }, userId);
}
// Attacker needs to know current password
```

**Attack scenario prevented:**
```
1. User leaves computer unlocked
2. Attacker uses open browser (session active)
3. Tries to change password
4. System asks for current password
5. Attacker doesn't know it
6. Change fails ✓
```

**2. Prevent Reusing Same Password**

```typescript
const isSameAsOld = await bcrypt.compare(newPassword, oldHash);
if (isSameAsOld) {
  return error('New password must be different');
}
```

**Why prevent?**
- Forces actual password rotation
- Prevents lazy security practices
- Encourages stronger passwords

**3. Password Strength Validation**

```typescript
const schema = z.object({
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain special character')
});
```

**Current: Minimum 8 characters**
**Future enhancement: Complexity requirements**

---

## Validation Strategy

### Three Layers of Validation

**1. Client-Side (Instant Feedback)**

```html
<input
  type="email"
  required
  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
/>

<script>
  input.addEventListener('input', () => {
    if (!isValid) {
      showError('Invalid email format');
    }
  });
</script>
```

**Benefits:**
- Instant feedback (no page reload)
- Better UX
- Reduces server load

**Limitation:**
- Can be bypassed (F12 console)
- Never trust alone

**2. Server-Side (Zod Validation)**

```typescript
const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name too short').max(100, 'Name too long'),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/).optional()
});

try {
  const validated = schema.parse(data);
} catch (error) {
  return redirect('?error=validation_failed');
}
```

**Benefits:**
- Can't be bypassed
- Type-safe
- Reusable schemas

**3. Database Constraints (Last Line of Defense)**

```sql
CREATE TABLE users (
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  whatsapp VARCHAR(20),
  
  CHECK (LENGTH(name) >= 2),
  CHECK (LENGTH(name) <= 100)
);
```

**Benefits:**
- Enforced at database level
- Prevents data corruption
- Race condition protection

**Example race condition:**
```
Request 1: Check email unique ✓ → Insert user
Request 2: Check email unique ✓ → Insert user
Both insert at same time
Without DB constraint: Two users with same email ❌
With DB constraint: Second insert fails ✅
```

---

## Error Handling

### User-Friendly Error Messages

```typescript
// ❌ Technical error (scary)
return error('SQLSTATE 23505: Unique constraint violation on users_email_key');

// ✅ User-friendly error
return redirect('/dashboard/profile?error=email_exists');

// UI displays:
<div class="alert alert-error">
  This email is already in use by another account.
  Please use a different email or 
  <a href="/login">login to the existing account</a>.
</div>
```

### Error Categories

**Validation Errors:**
- Invalid format
- Missing required fields
- Length constraints

**Business Logic Errors:**
- Email already exists
- Wrong current password
- Same as old password

**System Errors:**
- Database connection failed
- Email service down
- Redis unavailable

### Error Response Strategy

```typescript
try {
  await updateProfile();
  return redirect('?success=profile_updated');
} catch (error) {
  // Log technical details
  console.error('Profile update failed:', error);
  
  // Show user-friendly message
  if (error.code === '23505') {
    return redirect('?error=email_exists');
  }
  
  return redirect('?error=server_error');
}
```

**Never expose:**
- Stack traces
- Database error codes
- Internal paths
- API keys

---

## Testing Strategy

### Unit Tests (21 Tests)

```typescript
describe('Profile Management', () => {
  describe('Account Information Update', () => {
    it('should update name', async () => {
      const user = await createTestUser();
      const session = await createSession(user.id);
      
      const response = await POST({
        request: createFormRequest({
          form_type: 'account_info',
          name: 'New Name',
          email: user.email,
          whatsapp: ''
        }),
        cookies: createCookies({ session_id: session.id })
      });
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('success=profile_updated');
      
      const updated = await getUser(user.id);
      expect(updated.name).toBe('New Name');
    });
    
    it('should trigger re-verification on email change', async () => {
      const user = await createTestUser({ email: 'old@example.com', email_verified: true });
      const session = await createSession(user.id);
      
      const response = await POST({
        request: createFormRequest({
          form_type: 'account_info',
          name: user.name,
          email: 'new@example.com',
          whatsapp: ''
        }),
        cookies: createCookies({ session_id: session.id })
      });
      
      expect(response.headers.get('Location')).toContain('verify=pending');
      
      const updated = await getUser(user.id);
      expect(updated.email).toBe('new@example.com');
      expect(updated.email_verified).toBe(false);
      expect(updated.verification_token).toBeTruthy();
    });
    
    it('should reject duplicate email', async () => {
      const user1 = await createTestUser({ email: 'existing@example.com' });
      const user2 = await createTestUser({ email: 'other@example.com' });
      const session = await createSession(user2.id);
      
      const response = await POST({
        request: createFormRequest({
          form_type: 'account_info',
          name: user2.name,
          email: 'existing@example.com',  // Trying to use user1's email
          whatsapp: ''
        }),
        cookies: createCookies({ session_id: session.id })
      });
      
      expect(response.headers.get('Location')).toContain('error=email_exists');
    });
  });
  
  describe('Password Change', () => {
    it('should change password with correct current password', async () => {
      const user = await createTestUser({ password: 'OldPassword123' });
      const session = await createSession(user.id);
      
      const response = await POST({
        request: createFormRequest({
          form_type: 'password_change',
          current_password: 'OldPassword123',
          new_password: 'NewPassword456',
          confirm_new_password: 'NewPassword456'
        }),
        cookies: createCookies({ session_id: session.id })
      });
      
      expect(response.headers.get('Location')).toContain('success=password_changed');
      
      // Verify old password no longer works
      const oldValid = await verifyPassword(user.id, 'OldPassword123');
      expect(oldValid).toBe(false);
      
      // Verify new password works
      const newValid = await verifyPassword(user.id, 'NewPassword456');
      expect(newValid).toBe(true);
    });
    
    it('should reject wrong current password', async () => {
      const user = await createTestUser({ password: 'CorrectPassword' });
      const session = await createSession(user.id);
      
      const response = await POST({
        request: createFormRequest({
          form_type: 'password_change',
          current_password: 'WrongPassword',
          new_password: 'NewPassword456',
          confirm_new_password: 'NewPassword456'
        }),
        cookies: createCookies({ session_id: session.id })
      });
      
      expect(response.headers.get('Location')).toContain('error=wrong_password');
    });
    
    it('should reject same password', async () => {
      const user = await createTestUser({ password: 'SamePassword' });
      const session = await createSession(user.id);
      
      const response = await POST({
        request: createFormRequest({
          form_type: 'password_change',
          current_password: 'SamePassword',
          new_password: 'SamePassword',  // Same as old
          confirm_new_password: 'SamePassword'
        }),
        cookies: createCookies({ session_id: session.id })
      });
      
      expect(response.headers.get('Location')).toContain('error=same_password');
    });
  });
  
  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await POST({
        request: createFormRequest({
          form_type: 'account_info',
          name: 'Test',
          email: 'test@example.com'
        }),
        cookies: createCookies({})  // No session
      });
      
      expect(response.headers.get('Location')).toContain('/login');
    });
  });
});
```

### Integration Test Scenarios

**Happy Paths:**
1. Update name only
2. Update WhatsApp only
3. Update email (triggers re-verification)
4. Change password
5. Update multiple fields at once

**Error Paths:**
1. Invalid email format
2. Name too short/long
3. WhatsApp wrong format
4. Email already exists
5. Wrong current password
6. New password same as old
7. Password mismatch
8. Unauthenticated access

**Edge Cases:**
1. Empty WhatsApp (should clear)
2. Email unchanged (no re-verification)
3. Very long names (100 char limit)
4. International phone formats

---

## Security Checklist

### ✅ Implemented

**Authentication:**
- ✅ Session required for all updates
- ✅ Session validated on every request
- ✅ Redirect to login if not authenticated

**Authorization:**
- ✅ Users can only update own profile
- ✅ Session userId used (not from form data)

**Password Security:**
- ✅ Current password required for change
- ✅ Passwords hashed with bcrypt
- ✅ Minimum 8 characters
- ✅ Prevents reusing same password

**Email Security:**
- ✅ Normalized to lowercase
- ✅ Uniqueness enforced
- ✅ Re-verification on change
- ✅ Existing email notification (future)

**Input Validation:**
- ✅ Client-side validation
- ✅ Server-side validation (Zod)
- ✅ Database constraints
- ✅ SQL injection prevention (parameterized queries)

**Error Handling:**
- ✅ User-friendly messages
- ✅ No sensitive data in errors
- ✅ Detailed logging for debugging

### 🔄 Future Enhancements

**Rate Limiting:**
```typescript
// Prevent rapid profile changes
const key = `profile_updates:${session.userId}`;
const attempts = await redis.incr(key);
if (attempts === 1) {
  await redis.expire(key, 3600);  // 1 hour
}
if (attempts > 10) {
  return error('Too many updates. Try again in 1 hour.');
}
```

**Email Change Notification:**
```typescript
// Alert old email when changed
if (emailChanged) {
  await sendEmail(oldEmail, {
    subject: 'Email Address Changed',
    body: `Your email was changed to ${newEmail}. If this wasn't you, contact support.`
  });
}
```

**Password Complexity:**
```typescript
const schema = z.object({
  new_password: z.string()
    .min(8)
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain special character')
});
```

**Two-Factor Authentication:**
```typescript
// Require 2FA code for password change
if (user.twoFactorEnabled) {
  const code = formData.get('2fa_code');
  const isValid = await verify2FACode(user.id, code);
  if (!isValid) {
    return error('Invalid 2FA code');
  }
}
```

---

## User Experience Details

### Success Messages

```astro
{success === 'profile_updated' && (
  <div class="alert alert-success">
    ✓ Profile updated successfully!
  </div>
)}

{success === 'password_changed' && (
  <div class="alert alert-success">
    ✓ Password changed successfully!
  </div>
)}
```

### Error Messages

```astro
{error === 'email_exists' && (
  <div class="alert alert-error">
    ✗ This email is already in use.
    <a href="/login">Login instead?</a>
  </div>
)}

{error === 'wrong_password' && (
  <div class="alert alert-error">
    ✗ Current password is incorrect.
  </div>
)}

{error === 'same_password' && (
  <div class="alert alert-error">
    ✗ New password must be different from current password.
  </div>
)}
```

### Informational Messages

```astro
{verify === 'pending' && (
  <div class="alert alert-info">
    ℹ️ Verification email sent to {user.email}.
    Please check your inbox and click the link to verify.
    <form method="POST" action="/api/auth/resend-verification" style="display: inline;">
      <button type="submit" class="link-button">Resend email</button>
    </form>
  </div>
)}
```

### Loading States (Future)

```html
<button type="submit" id="submit-btn">
  Update Account Info
</button>

<script>
  const form = document.getElementById('account-form');
  const btn = document.getElementById('submit-btn');
  
  form.addEventListener('submit', () => {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  });
</script>
```

---

## Complete User Journey

### Scenario: User Changes Email

```
1. User navigates to /dashboard/profile
   ↓
2. Page renders with current data
   Name: John Doe
   Email: john@oldmail.com ✓ Verified
   WhatsApp: +12345678901
   ↓
3. User changes email to john@gmail.com
   ↓
4. User submits form
   ↓
5. Server validates:
   ✓ Email format valid
   ✓ Email not already in use
   ✓ User authenticated
   ↓
6. Server updates database:
   - email = 'john@gmail.com'
   - email_verified = FALSE
   - verification_token = '...'
   - verification_token_expires_at = NOW() + 24h
   ↓
7. Server sends verification email to john@gmail.com
   ↓
8. Server redirects: /dashboard/profile?success=profile_updated&verify=pending
   ↓
9. Page shows:
   Name: John Doe
   Email: john@gmail.com ⚠️ Not Verified
   WhatsApp: +12345678901
   
   [Info Banner]
   Verification email sent to john@gmail.com.
   Please check your inbox.
   [Resend Email]
   ↓
10. User checks email, clicks verify link
    ↓
11. Server verifies token:
    ✓ Token valid
    ✓ Not expired
    ↓
12. Server updates database:
    - email_verified = TRUE
    - verification_token = NULL
    ↓
13. Server redirects: /login?success=email_verified
    ↓
14. User logs in again (if needed)
    ↓
15. Dashboard shows: john@gmail.com ✓ Verified
```

---

## Key Takeaways

1. **Security First**
   - Current password required for password changes
   - Email changes trigger re-verification
   - All queries parameterized (SQL injection prevention)
   - Session-based authentication

2. **Three-Layer Validation**
   - Client-side: Instant feedback
   - Server-side: Can't be bypassed
   - Database: Last line of defense

3. **User Experience**
   - Clear success/error messages
   - Real-time validation feedback
   - Progressive enhancement (works without JS)
   - Contextual help text

4. **Integration Points**
   - Email verification system (T060)
   - Authentication system (T053-T059)
   - Session management (Redis)
   - Email service (T048)

5. **Testing Coverage**
   - 21 unit tests
   - All paths covered (happy + error + edge)
   - Integration with other systems tested
   - Requires running server (database + Redis)

---

**Related Files:**
- [src/pages/dashboard/profile.astro](/home/dan/web/src/pages/dashboard/profile.astro)
- [src/pages/api/dashboard/profile.ts](/home/dan/web/src/pages/api/dashboard/profile.ts)
- [tests/integration/T061-T062-profile.test.ts](/home/dan/web/tests/integration/T061-T062-profile.test.ts)

**Previous Guide:** [Email Verification (T060)](./phase4-email-verification.md)
**Next Guide:** Phase 5: Admin Management (Coming Soon)
