# External Services Setup Guide

Complete step-by-step guide to set up all required external services for your Cloudflare deployment.

**Estimated Time**: 15-20 minutes
**Cost**: All services have generous free tiers

---

## 📋 Overview

You need to set up 4 external services:

1. ✅ **Neon PostgreSQL** - Database (5 min)
2. ✅ **Upstash Redis** - Caching & Sessions (5 min)
3. ✅ **Stripe** - Payment Processing (5 min)
4. ✅ **Resend** - Email Delivery (5 min)

---

## 1️⃣ Neon PostgreSQL Setup (5 min)

### Step 1: Create Account

1. Go to **https://neon.tech**
2. Click **Sign Up** or **Get Started**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### Step 2: Create Project

1. Click **"New Project"** or **"Create a project"**
2. Fill in details:
   ```
   Project Name: mystic-ecom-production
   Database Name: main
   PostgreSQL Version: 16 (latest)
   Region: Choose closest to your users
   ```

   **Region Recommendations:**
   - US users: `US East (Ohio)` or `US West (Oregon)`
   - EU users: `Europe (Frankfurt)` or `Europe (London)`
   - Asia users: `Asia Pacific (Singapore)`

3. Click **"Create Project"**

### Step 3: Get Connection String

1. After project creation, you'll see the dashboard
2. Click on **"Connection Details"** or look for the connection string
3. You'll see something like:
   ```
   postgresql://username:password@ep-cool-name-12345678.us-east-2.aws.neon.tech/main?sslmode=require
   ```

4. **IMPORTANT**: Copy the ENTIRE connection string including `?sslmode=require`

5. **Save it securely** - you'll need this for Cloudflare environment variables

   Create a temporary file to store your credentials:
   ```bash
   # Create a secure credentials file (DO NOT COMMIT THIS)
   cat > ~/deployment-credentials.txt << 'EOF'
   # DEPLOYMENT CREDENTIALS - DELETE AFTER DEPLOYMENT
   # Generated: $(date)

   # Neon PostgreSQL
   DATABASE_URL=PASTE_YOUR_CONNECTION_STRING_HERE

   # Upstash Redis (fill in later)
   REDIS_URL=

   # Stripe (fill in later)
   STRIPE_SECRET_KEY=
   STRIPE_PUBLISHABLE_KEY=
   STRIPE_WEBHOOK_SECRET=

   # Resend (fill in later)
   RESEND_API_KEY=
   EOF
   ```

### Step 4: Configure Database Settings (Optional but Recommended)

1. In Neon dashboard, go to **Settings**
2. Enable **Auto-suspend** to save costs (database pauses when inactive)
3. Set **Auto-suspend delay**: 5 minutes (default)
4. Enable **Autoscaling** for better performance

### Step 5: Note Down Database Details

You'll need these later:
- ✅ Connection string (DATABASE_URL)
- ✅ Database name: `main`
- ✅ PostgreSQL version: 16

**✅ Neon Setup Complete!** We'll import the schema later.

---

## 2️⃣ Upstash Redis Setup (5 min)

### Step 1: Create Account

1. Go to **https://upstash.com**
2. Click **Sign Up** or **Get Started for Free**
3. Sign up with GitHub (recommended) or email

### Step 2: Create Redis Database

1. Click **"Create Database"**
2. Fill in details:
   ```
   Name: mystic-ecom-production
   Type: Regional (faster, recommended)
   Region: Same as your Neon database
   TLS: Enabled (REQUIRED - should be enabled by default)
   Eviction: No eviction (recommended for session storage)
   ```

3. Click **"Create"**

### Step 3: Get Connection Details

1. After creation, click on your database
2. Scroll down to **"REST API"** or **"Connection Details"**
3. Look for **"Redis Connection URL"**
4. Copy the connection string that starts with `rediss://`
   ```
   rediss://default:AbCdEf123456...@us1-example-12345.upstash.io:6379
   ```

5. **IMPORTANT**: Make sure it starts with `rediss://` (double 's' for SSL)

6. **Save it** to your credentials file:
   ```bash
   # Edit your credentials file
   nano ~/deployment-credentials.txt
   # Add your Redis URL
   ```

### Step 4: Configure Redis Settings (Optional)

1. In Upstash dashboard, click on your database
2. Go to **Settings**
3. Verify:
   - ✅ TLS is enabled
   - ✅ Region is correct
   - ✅ Eviction policy: `noeviction` (for sessions)

### Step 5: Test Connection (Optional)

If you have redis-cli installed:
```bash
redis-cli -u "YOUR_REDIS_URL" ping
# Should return: PONG
```

**✅ Upstash Redis Setup Complete!**

---

## 3️⃣ Stripe Setup (5 min)

### Step 1: Create Account

1. Go to **https://stripe.com**
2. Click **"Start now"** or **"Sign up"**
3. Fill in your business details
4. Verify your email

### Step 2: Activate Your Account

1. Complete the onboarding questionnaire
2. Provide business information
3. Set up bank account for payouts (can do later)

### Step 3: Get API Keys

1. In Stripe Dashboard, click **"Developers"** in top right
2. Click **"API keys"** in left sidebar
3. You'll see two environments:
   - **Test mode** (for development)
   - **Live mode** (for production)

4. **Toggle to "Live mode"** using the switch in sidebar

5. Copy your keys:
   ```
   Publishable key: pk_live_xxxxxxxxxxxxx
   Secret key: sk_live_xxxxxxxxxxxxx (click "Reveal" to see)
   ```

6. **Save them** to your credentials file:
   ```bash
   nano ~/deployment-credentials.txt
   # Add:
   # STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   # STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   ```

### Step 4: Set Up Webhook (Do AFTER Cloudflare deployment)

**⚠️ IMPORTANT**: You'll need your Cloudflare URL first, so we'll do this after deployment.

For now, just note that you'll need to:
1. Create webhook endpoint at: `https://your-site.pages.dev/api/webhooks/stripe`
2. Subscribe to payment events
3. Copy the webhook secret

**Temporary placeholder** for now:
```bash
# Add to credentials file
STRIPE_WEBHOOK_SECRET=whsec_SETUP_AFTER_DEPLOYMENT
```

### Step 5: Test Mode Keys (for development)

While you're here, also copy your **Test mode** keys for local development:
```bash
# Switch to "Test mode"
# Copy keys to .env.local for local testing
```

**✅ Stripe Setup Complete!** (Webhook will be configured after deployment)

---

## 4️⃣ Resend Email Setup (5 min)

### Step 1: Create Account

1. Go to **https://resend.com**
2. Click **"Start Building"** or **"Sign Up"**
3. Sign up with email
4. Verify your email address

### Step 2: Get API Key

1. After login, go to **"API Keys"** in left sidebar
2. Click **"Create API Key"**
3. Fill in details:
   ```
   Name: mystic-ecom-production
   Permission: Full Access (or Sending access)
   ```
4. Click **"Create"**
5. **Copy the API key immediately** - it won't be shown again!
   ```
   re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. **Save it** to your credentials file:
   ```bash
   nano ~/deployment-credentials.txt
   # Add:
   # RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 3: Add Domain (Recommended for Production)

**For testing**, you can use Resend's default domain (`onboarding.resend.dev`)

**For production**, add your own domain:

1. Go to **"Domains"** in left sidebar
2. Click **"Add Domain"**
3. Enter your domain (e.g., `mystic-ecom.com`)
4. Click **"Add"**
5. Add DNS records shown by Resend to your domain's DNS settings
6. Wait for verification (usually 5-30 minutes)

**For now**, use the default:
```bash
# Add to credentials file
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=Mystic Ecom
```

### Step 4: Test Email (Optional)

You can send a test email from Resend dashboard:
1. Go to **"Emails"** → **"Send Test Email"**
2. Enter your email
3. Send to verify it's working

**✅ Resend Setup Complete!**

---

## 5️⃣ Generate Security Secrets

Generate random secrets for your application:

```bash
# Generate 4 secrets (run this command 4 times)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Run the command 4 times** and save each output:

```bash
# Add to credentials file
SESSION_SECRET=FIRST_GENERATED_SECRET
JWT_SECRET=SECOND_GENERATED_SECRET
CSRF_SECRET=THIRD_GENERATED_SECRET
DOWNLOAD_TOKEN_SECRET=FOURTH_GENERATED_SECRET
```

---

## 6️⃣ Complete Credentials File

Your `~/deployment-credentials.txt` should now look like this:

```bash
# DEPLOYMENT CREDENTIALS - DELETE AFTER DEPLOYMENT
# Generated: 2025-11-07

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/main?sslmode=require

# Upstash Redis
REDIS_URL=rediss://default:pass@xxx.upstash.io:6379

# Security Secrets
SESSION_SECRET=abc123...
JWT_SECRET=def456...
CSRF_SECRET=ghi789...
DOWNLOAD_TOKEN_SECRET=jkl012...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_SETUP_AFTER_DEPLOYMENT

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=Mystic Ecom

# Admin
ADMIN_EMAIL=your-email@example.com

# Site Config
PUBLIC_SITE_URL=https://your-project.pages.dev
NODE_ENV=production
```

---

## 7️⃣ Import Database Schema

Now that Neon is set up, let's import your database schema.

### Check if you have a schema file:

```bash
# Check for schema files
ls -la database/
```

### If you have database/schema.sql or similar:

```bash
# Set your Neon connection string
export DATABASE_URL="your-neon-connection-string"

# Import schema
psql "$DATABASE_URL" < database/schema.sql

# Or if you have migrations
npm run db:migrate  # if this script exists
```

### If you DON'T have a schema file yet:

You'll need to create your database tables. Check if there are SQL files in your project:

```bash
# Search for SQL files
find . -name "*.sql" -type f
```

**Let me check your project structure** - I'll help you find and import the schema in the next step.

---

## ✅ Setup Complete Checklist

Mark off as you complete each service:

- [ ] **Neon PostgreSQL**
  - [ ] Account created
  - [ ] Project created
  - [ ] Connection string saved
  - [ ] Schema imported (we'll do this next)

- [ ] **Upstash Redis**
  - [ ] Account created
  - [ ] Database created (with TLS enabled)
  - [ ] Connection URL saved (starts with `rediss://`)

- [ ] **Stripe**
  - [ ] Account created and activated
  - [ ] Live mode API keys obtained
  - [ ] Keys saved securely
  - [ ] Webhook endpoint noted (configure after deployment)

- [ ] **Resend**
  - [ ] Account created
  - [ ] API key generated and saved
  - [ ] Email sender configured

- [ ] **Security Secrets**
  - [ ] 4 random secrets generated
  - [ ] All secrets saved to credentials file

---

## 🔒 Security Notes

**IMPORTANT**:

1. **Never commit** `~/deployment-credentials.txt` to git
2. **Delete** this file after deployment is complete
3. **Store** credentials in a password manager for safekeeping
4. **Use environment variables** in Cloudflare, not hardcoded values
5. **Rotate secrets** periodically for security

---

## 📊 Free Tier Limits

All services offer generous free tiers:

**Neon PostgreSQL (Free)**:
- 10 projects
- 3 GB storage per project
- 1 concurrent connection
- Unlimited compute hours

**Upstash Redis (Free)**:
- 10,000 commands/day
- 256 MB storage
- TLS included

**Stripe (Free)**:
- No monthly fees
- Pay only per transaction (2.9% + $0.30)
- Unlimited API calls

**Resend (Free)**:
- 3,000 emails/month
- 100 emails/day
- 1 domain

---

## 🆘 Troubleshooting

### Neon Connection Issues

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# If fails, check:
# 1. Connection string has ?sslmode=require
# 2. Database is not suspended (wake it in dashboard)
# 3. No firewall blocking port 5432
```

### Redis Connection Issues

```bash
# Test connection
redis-cli -u "$REDIS_URL" ping

# If fails, check:
# 1. URL starts with rediss:// (double 's')
# 2. Correct password
# 3. TLS is enabled in Upstash
```

### Stripe Webhook Issues

- Webhooks are configured AFTER deployment
- You need your live Cloudflare URL first
- Test with Stripe CLI locally before production

### Email Sending Issues

- Verify email address in Resend
- Check API key is correct
- Monitor sending limits
- Add custom domain for better deliverability

---

## Next Steps

Once all services are set up:

1. ✅ You have all credentials saved
2. ✅ Import database schema (next step)
3. ✅ Test connections
4. ✅ Proceed to Cloudflare Pages deployment
5. ✅ Add environment variables in Cloudflare dashboard

**Continue to**: Cloudflare Pages deployment (Step 2 in CLOUDFLARE_QUICKSTART.md)

---

**Need Help?**
- Neon Docs: https://neon.tech/docs
- Upstash Docs: https://docs.upstash.com
- Stripe Docs: https://stripe.com/docs
- Resend Docs: https://resend.com/docs
