# Production Deployment Guide

**Platform:** Spirituality E-Commerce Platform
**Version:** 1.0.0
**Last Updated:** November 5, 2025
**Environment:** Production

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Database Configuration](#database-configuration)
5. [Redis Configuration](#redis-configuration)
6. [Environment Variables](#environment-variables)
7. [Security Configuration](#security-configuration)
8. [Deployment Process](#deployment-process)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Backup & Disaster Recovery](#backup--disaster-recovery)
12. [Rollback Procedures](#rollback-procedures)
13. [Performance Optimization](#performance-optimization)
14. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for deploying the Spirituality E-Commerce Platform to production. It covers infrastructure setup, security hardening, monitoring, and disaster recovery procedures.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CDN / Cloudflare                        │
│                    (Global Edge Network)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
┌─────────▼────────┐      ┌────────▼────────┐
│  Astro SSR App   │      │  Static Assets  │
│  (Cloudflare     │      │  (Images, CSS,  │
│   Workers)       │      │   JS, Fonts)    │
└─────────┬────────┘      └─────────────────┘
          │
          │
┌─────────┴────────────────────────────────────────┐
│                                                   │
│              ┌──────────────┐                    │
│              │  PostgreSQL  │                    │
│              │  (Neon.tech) │                    │
│              └──────┬───────┘                    │
│                     │                             │
│              ┌──────▼───────┐                    │
│              │    Redis      │                    │
│              │  (Upstash)    │                    │
│              └──────────────┘                    │
│                                                   │
│              ┌──────────────┐                    │
│              │   Stripe     │                    │
│              │  (Payments)  │                    │
│              └──────────────┘                    │
│                                                   │
│              ┌──────────────┐                    │
│              │   SendGrid   │                    │
│              │   (Email)    │                    │
│              └──────────────┘                    │
│                                                   │
│              ┌──────────────┐                    │
│              │    Sentry    │                    │
│              │  (Monitoring)│                    │
│              └──────────────┘                    │
└───────────────────────────────────────────────────┘
```

### Deployment Platforms

**Recommended:** Cloudflare Pages
- Serverless deployment
- Global edge network
- Automatic HTTPS
- DDoS protection
- Unlimited bandwidth (free tier)

**Alternatives:**
- Vercel (Astro-optimized)
- VPS (DigitalOcean, Linode) - Full control

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All unit tests passing (`npm test`)
- [ ] All integration tests passing
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Code linting passed (`npm run lint`)
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No security vulnerabilities (`npm audit`)

### Documentation

- [ ] README.md updated
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Rollback procedures defined

### Security

- [ ] Environment variables configured (no secrets in code)
- [ ] Database credentials secured
- [ ] API keys rotated from development
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] Security headers configured

### Infrastructure

- [ ] Database provisioned and tested
- [ ] Redis instance provisioned
- [ ] CDN/Hosting account created
- [ ] Domain name configured
- [ ] SSL certificates provisioned
- [ ] Email service configured
- [ ] Payment gateway configured (Stripe)
- [ ] Monitoring service setup (Sentry)
- [ ] Backup strategy defined

### Performance

- [ ] Database indexes created
- [ ] Static assets optimized
- [ ] Images compressed and optimized
- [ ] CSS/JS minified
- [ ] Caching strategy implemented
- [ ] Load testing completed
- [ ] Performance benchmarks met

---

## Infrastructure Setup

### 1. Database (PostgreSQL)

**Recommended:** Neon.tech (Serverless PostgreSQL)

**Why Neon?**
- Serverless architecture (scales to zero)
- Free tier: 0.5GB storage
- Built-in connection pooling
- Branch databases for testing
- Automatic backups
- Point-in-time recovery

**Setup Steps:**

1. **Create Neon Account**
   ```bash
   # Visit: https://neon.tech
   # Sign up with GitHub/Google
   ```

2. **Create Project**
   ```bash
   Project Name: mystic-ecom-production
   Region: Choose closest to your users
   PostgreSQL Version: 16 (latest stable)
   ```

3. **Get Connection String**
   ```bash
   # Format:
   postgresql://username:password@ep-xxx-xxx.region.neon.tech/dbname?sslmode=require

   # Example:
   postgresql://mystic_user:abc123xyz@ep-cool-sound-12345.us-east-2.neon.tech/mystic_db?sslmode=require
   ```

4. **Run Database Schema**
   ```bash
   # Connect to database
   psql "postgresql://username:password@ep-xxx.region.neon.tech/dbname?sslmode=require"

   # Run schema
   \i database/schema.sql

   # Verify tables created
   \dt

   # Check constraints
   \d users
   \d courses
   \d orders

   # Exit
   \q
   ```

5. **Create Database User**
   ```sql
   -- Create application user
   CREATE USER app_user WITH PASSWORD 'your-secure-password';

   -- Grant permissions
   GRANT CONNECT ON DATABASE mystic_db TO app_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

   -- Set default privileges for future tables
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
   ```

**Alternatives:**

- **Supabase:** Free tier, includes auth & storage
- **Railway:** $5/month, includes Redis
- **AWS RDS:** Enterprise, requires more setup
- **DigitalOcean Managed PostgreSQL:** $15/month

---

### 2. Redis (Session & Caching)

**Recommended:** Upstash Redis (Serverless)

**Why Upstash?**
- Serverless Redis (pay per request)
- Free tier: 10,000 requests/day
- Global replication
- REST API support
- Perfect for edge deployments

**Setup Steps:**

1. **Create Upstash Account**
   ```bash
   # Visit: https://console.upstash.com
   # Sign up with GitHub/Google
   ```

2. **Create Database**
   ```bash
   Name: mystic-ecom-sessions
   Type: Regional (or Global for multi-region)
   Region: us-east-1 (choose closest to database)
   Primary Region: Same as Neon database
   Read Regions: Optional (for global apps)
   ```

3. **Get Connection Details**
   ```bash
   # REST API (recommended for Cloudflare Workers)
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXxxx...

   # Traditional Redis URL
   REDIS_URL=redis://default:password@region.upstash.io:6379
   ```

4. **Test Connection**
   ```bash
   # Using redis-cli
   redis-cli -u "redis://default:password@region.upstash.io:6379"

   # Test commands
   SET test "Hello World"
   GET test
   DEL test
   QUIT
   ```

**Alternatives:**

- **Railway Redis:** Included with PostgreSQL plan
- **Redis Cloud:** Free tier available
- **DigitalOcean Managed Redis:** $15/month
- **Self-hosted:** On VPS with backup strategy

---

### 3. CDN / Hosting (Cloudflare Pages)

**Why Cloudflare Pages?**
- Free tier with unlimited bandwidth
- Global CDN with 300+ edge locations
- Automatic HTTPS & DDoS protection
- Serverless functions (Cloudflare Workers)
- Automatic deployments from Git
- Preview deployments for PRs

**Setup Steps:**

1. **Create Cloudflare Account**
   ```bash
   # Visit: https://dash.cloudflare.com
   # Sign up with email
   ```

2. **Connect to GitHub**
   ```bash
   # In Cloudflare Dashboard:
   # 1. Click "Workers & Pages"
   # 2. Click "Create application"
   # 3. Select "Pages" tab
   # 4. Click "Connect to Git"
   # 5. Authorize GitHub
   # 6. Select repository: danribes/mystic-ecom
   ```

3. **Configure Build Settings**
   ```yaml
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Root directory: (leave empty)
   ```

4. **Set Environment Variables** (see Environment Variables section)

5. **Deploy**
   ```bash
   # Click "Save and Deploy"
   # Wait 2-3 minutes for build
   # Site live at: https://mystic-ecom.pages.dev
   ```

---

## Environment Variables

### Required Variables

Create these in your deployment platform (Cloudflare Pages, Vercel, etc.):

```bash
# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_VERSION=20
NODE_ENV=production

# ============================================
# APPLICATION
# ============================================
PUBLIC_SITE_URL=https://yourdomain.com

# ============================================
# DATABASE (PostgreSQL)
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Example (Neon):
# DATABASE_URL=postgresql://mystic_user:abc123@ep-cool-sound-12345.us-east-2.neon.tech/mystic_db?sslmode=require

# ============================================
# REDIS (Sessions & Caching)
# ============================================
REDIS_URL=redis://default:password@host:6379

# Example (Upstash):
# REDIS_URL=redis://default:AXXXxxx@us1-proper-firefly-12345.upstash.io:6379

# Or use REST API (for Cloudflare Workers):
# UPSTASH_REDIS_REST_URL=https://us1-proper-firefly-12345.upstash.io
# UPSTASH_REDIS_REST_TOKEN=AXXXxxx...

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-randomly-generated-32-char-minimum-secret-key-here

# Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ============================================
# STRIPE (Payment Processing)
# ============================================
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# For testing:
# STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
# STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE

# ============================================
# EMAIL (SMTP)
# ============================================
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Gmail alternative:
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-16-char-app-password
# EMAIL_FROM=your-email@gmail.com

# ============================================
# MONITORING (Optional but recommended)
# ============================================
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/1234567

# ============================================
# CLOUDFLARE (if using Cloudflare Pages)
# ============================================
CF_PAGES=1
CF_PAGES_BRANCH=main
```

### Generate Secure Secrets

```bash
# JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or with OpenSSL
openssl rand -base64 32

# Or with Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Environment Variable Management

**Cloudflare Pages:**
```bash
# In Dashboard:
# 1. Go to Workers & Pages
# 2. Select your site
# 3. Settings → Environment Variables
# 4. Add each variable
# 5. Set scope: Production / Preview / Development
```

**Vercel:**
```bash
# Using CLI
vercel env add DATABASE_URL production

# Or in Dashboard:
# Settings → Environment Variables
```

---

## Security Configuration

### 1. HTTPS & SSL

**Cloudflare Pages:**
- Automatic HTTPS enabled
- Free SSL certificates
- Automatic HTTP → HTTPS redirect
- HSTS enabled by default

**Custom Domain SSL:**
```bash
# In Cloudflare:
# 1. Add custom domain
# 2. SSL automatically provisioned
# 3. Universal SSL certificate issued
# 4. Enable "Always Use HTTPS"
# 5. Enable "Automatic HTTPS Rewrites"
```

### 2. Security Headers

Ensure these headers are set (automatic in Cloudflare):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. Rate Limiting

Configure in application (see `src/lib/rateLimit.ts`):

```typescript
// API endpoints
const apiLimiter = {
  points: 100,    // 100 requests
  duration: 60,   // per minute
};

// Authentication endpoints
const authLimiter = {
  points: 5,      // 5 attempts
  duration: 900,  // per 15 minutes
};

// Payment endpoints
const paymentLimiter = {
  points: 10,     // 10 requests
  duration: 3600, // per hour
};
```

### 4. Database Security

```sql
-- Revoke public access
REVOKE ALL ON DATABASE mystic_db FROM PUBLIC;

-- Use least privilege principle
GRANT CONNECT ON DATABASE mystic_db TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- No DROP, ALTER, or TRUNCATE permissions

-- Enable SSL connections only
ALTER DATABASE mystic_db SET ssl = on;

-- Set connection limits
ALTER USER app_user CONNECTION LIMIT 20;
```

### 5. API Key Rotation

**Production Keys (Never use test keys):**

```bash
# Stripe
# 1. Go to https://dashboard.stripe.com/apikeys
# 2. Reveal live mode keys
# 3. Copy Secret key (sk_live_...)
# 4. Copy Publishable key (pk_live_...)

# SendGrid
# 1. Go to https://app.sendgrid.com/settings/api_keys
# 2. Create API Key with "Mail Send" permission
# 3. Copy and save (only shown once)

# JWT Secret
# Generate new secret for production (never reuse dev secret)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. CORS Configuration

```typescript
// src/middleware/cors.ts
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  // Add staging if needed
  'https://staging.yourdomain.com',
];

// Only allow specific origins in production
if (import.meta.env.PROD) {
  response.headers.set('Access-Control-Allow-Origin', origin);
}
```

---

## Deployment Process

### Step 1: Pre-Deployment Testing

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run all tests
npm test
npm run test:e2e

# 4. Build application
npm run build

# 5. Test build locally
npm run preview

# 6. Security audit
npm audit --production
npm audit fix

# 7. Check for outdated dependencies
npm outdated
```

### Step 2: Database Migration

```bash
# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
psql $STAGING_DATABASE_URL -f database/migrations/xxx_migration.sql

# 3. If successful, run on production
psql $DATABASE_URL -f database/migrations/xxx_migration.sql

# 4. Verify migration
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### Step 3: Deploy to Production

**Option A: Cloudflare Pages (Automatic)**

```bash
# 1. Commit changes
git add .
git commit -m "Release: v1.0.0 - Production deployment"

# 2. Tag release
git tag -a v1.0.0 -m "Production release v1.0.0"

# 3. Push to GitHub
git push origin main
git push origin v1.0.0

# 4. Cloudflare automatically:
#    - Detects push
#    - Builds application
#    - Deploys to production
#    - Takes 2-3 minutes

# 5. Monitor deployment
# Visit: https://dash.cloudflare.com/pages
```

**Option B: Manual Deployment (Vercel)**

```bash
# Deploy to production
vercel --prod

# Or with environment
vercel --prod --env DATABASE_URL=postgresql://...
```

**Option C: VPS Deployment**

```bash
# 1. SSH into server
ssh user@production-server

# 2. Pull latest code
cd /var/www/mystic-ecom
git pull origin main

# 3. Install dependencies
npm ci --production

# 4. Build
npm run build

# 5. Restart application
pm2 restart mystic-ecom

# 6. Verify
pm2 status
pm2 logs mystic-ecom --lines 100
```

### Step 4: Configure Stripe Webhooks

```bash
# 1. Go to Stripe Dashboard
# https://dashboard.stripe.com/webhooks

# 2. Add endpoint
# URL: https://yourdomain.com/api/checkout/webhook

# 3. Select events:
#    - checkout.session.completed
#    - payment_intent.succeeded
#    - payment_intent.payment_failed
#    - customer.subscription.created
#    - customer.subscription.updated
#    - customer.subscription.deleted

# 4. Copy webhook secret (whsec_...)
# 5. Add to environment variables as STRIPE_WEBHOOK_SECRET
```

### Step 5: Verify Deployment

See [Post-Deployment Verification](#post-deployment-verification) section.

---

## Post-Deployment Verification

### Automated Checks

```bash
# Run deployment validation tests
npm run test:deployment

# Check application health
curl https://yourdomain.com/api/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected",
#   "timestamp": "2025-11-05T10:00:00.000Z"
# }
```

### Manual Verification Checklist

#### Application Access
- [ ] Homepage loads (`https://yourdomain.com`)
- [ ] All static assets load (images, CSS, JS)
- [ ] No console errors in browser DevTools
- [ ] Page load time < 3 seconds

#### User Flows
- [ ] User registration works
- [ ] Email verification sent
- [ ] User login works
- [ ] Password reset works
- [ ] Session persists across page loads

#### Course Functionality
- [ ] Course catalog loads
- [ ] Course detail pages load
- [ ] Add to cart works
- [ ] Cart persists across sessions
- [ ] Checkout flow works

#### Payment Integration
- [ ] Stripe checkout opens
- [ ] Test payment succeeds (use test card: 4242 4242 4242 4242)
- [ ] Order confirmation email sent
- [ ] Order appears in user dashboard
- [ ] Course access granted after purchase

#### Admin Functionality
- [ ] Admin login works
- [ ] Admin dashboard loads
- [ ] Can create/edit courses
- [ ] Can view orders
- [ ] Can manage users

#### Internationalization
- [ ] Language switcher works (EN ↔ ES)
- [ ] Translations load correctly
- [ ] Currency displays correctly
- [ ] Date formats correct for locale

#### Performance
- [ ] Lighthouse score > 90
- [ ] Time to First Byte < 500ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

#### Security
- [ ] HTTPS enforced (no HTTP access)
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] CSRF tokens working

---

## Monitoring & Alerting

### 1. Application Monitoring (Sentry)

**Setup Sentry:**

```bash
# 1. Install Sentry
npm install @sentry/node @sentry/astro

# 2. Create account at https://sentry.io

# 3. Create project
# Platform: Node.js
# Project name: mystic-ecom-production

# 4. Get DSN
# Format: https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/1234567

# 5. Add to environment variables
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/1234567
```

**Configure Sentry:**

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/node';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.SENTRY_DSN,
    environment: 'production',

    // Performance monitoring
    tracesSampleRate: 1.0,

    // Release tracking
    release: '1.0.0',

    // Error filtering
    beforeSend(event, hint) {
      // Don't send 404 errors
      if (event.exception?.values?.[0]?.type === 'NotFoundError') {
        return null;
      }
      return event;
    },
  });
}
```

**Alert Configuration:**

```yaml
# In Sentry Dashboard:
Alerts → Create Alert Rule

Conditions:
  - When error count > 10 in 5 minutes
  - When response time > 3 seconds
  - When error rate > 1%

Actions:
  - Send email to: team@yourdomain.com
  - Send Slack notification
  - Create GitHub issue
```

### 2. Uptime Monitoring

**Recommended Service:** UptimeRobot (free tier)

```bash
# 1. Sign up at https://uptimerobot.com

# 2. Add monitors:
#    - Homepage: https://yourdomain.com
#    - API Health: https://yourdomain.com/api/health
#    - Stripe Webhook: https://yourdomain.com/api/checkout/webhook

# 3. Configure:
#    - Check interval: 5 minutes
#    - Monitor type: HTTPS
#    - Alert contacts: email, SMS

# 4. Set alert triggers:
#    - Down for 5 minutes
#    - Response time > 5 seconds
```

### 3. Database Monitoring

**Neon Dashboard Metrics:**
- Connection count
- Query performance
- Storage usage
- CPU usage

**Custom Monitoring:**

```sql
-- Create monitoring view
CREATE VIEW db_health AS
SELECT
  (SELECT count(*) FROM pg_stat_activity) as active_connections,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as db_size,
  (SELECT count(*) FROM users) as total_users,
  (SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '24 hours') as orders_24h;

-- Query health metrics
SELECT * FROM db_health;
```

### 4. Performance Monitoring

**Web Vitals Tracking:**

```typescript
// src/lib/analytics.ts
import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';

// Send to analytics
function sendToAnalytics(metric) {
  // Send to your analytics service
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
  }
}

// Track Core Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
onINP(sendToAnalytics);
```

---

## Backup & Disaster Recovery

### 1. Database Backups

**Automated Backups (Neon):**
- Daily automatic backups
- 7-day retention (free tier)
- Point-in-time recovery
- Branch databases for testing

**Manual Backups:**

```bash
# Daily backup script (run via cron)
#!/bin/bash

# Backup directory
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://mystic-ecom-backups/
```

**Cron Schedule:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### 2. Redis Backups

**Upstash Backups:**
- Automatic persistence
- Snapshot backups daily
- Export to JSON

**Manual Export:**

```bash
# Export all keys
redis-cli -u $REDIS_URL --scan > redis_keys.txt

# Dump database
redis-cli -u $REDIS_URL --rdb /path/to/dump.rdb
```

### 3. Code Backups

**Git Repository:**
- Primary: GitHub
- Mirror: GitLab (optional)
- Local: Developer machines

**Tag Releases:**

```bash
# Tag each production release
git tag -a v1.0.0 -m "Production release 1.0.0"
git push origin v1.0.0
```

### 4. Disaster Recovery Plan

**Recovery Time Objective (RTO):** 2 hours
**Recovery Point Objective (RPO):** 1 hour

**Recovery Steps:**

1. **Database Corruption**
   ```bash
   # Restore from latest backup
   gunzip -c backup_20250105_020000.sql.gz | psql $DATABASE_URL

   # Verify restoration
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

2. **Application Failure**
   ```bash
   # Rollback to previous deployment
   # In Cloudflare Pages:
   # 1. Go to Deployments
   # 2. Find last working deployment
   # 3. Click "Rollback to this deployment"
   ```

3. **Complete Infrastructure Failure**
   ```bash
   # Deploy to backup platform (Vercel)

   # 1. Import project
   vercel import github.com/danribes/mystic-ecom

   # 2. Configure environment variables
   vercel env add DATABASE_URL
   vercel env add REDIS_URL
   # ... add all variables

   # 3. Deploy
   vercel --prod

   # 4. Update DNS to point to Vercel
   ```

---

## Rollback Procedures

### 1. Application Rollback

**Cloudflare Pages:**

```bash
# Method 1: Via Dashboard
# 1. Go to Workers & Pages → Your site
# 2. Click "Deployments"
# 3. Find last working deployment
# 4. Click "..." → "Rollback to this deployment"
# 5. Confirm rollback

# Method 2: Via Git
git log --oneline
git revert <commit-hash>
git push origin main
# Cloudflare auto-deploys the revert
```

**Vercel:**

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>

# Or promote specific deployment to production
vercel promote <deployment-url>
```

### 2. Database Rollback

**Only if migration failed:**

```bash
# 1. Stop application to prevent new writes
# 2. Restore from backup
gunzip -c backup_before_migration.sql.gz | psql $DATABASE_URL

# 3. Restart application
# 4. Monitor for errors
```

**Point-in-Time Recovery (Neon):**

```bash
# In Neon Dashboard:
# 1. Go to Branches
# 2. Create new branch from specific timestamp
# 3. Update DATABASE_URL to point to new branch
# 4. Test application
# 5. If successful, promote branch to main
```

### 3. Hotfix Procedure

**For critical bugs in production:**

```bash
# 1. Create hotfix branch from production tag
git checkout -b hotfix/critical-bug v1.0.0

# 2. Fix the bug
# ... make changes

# 3. Test fix
npm test

# 4. Commit fix
git commit -m "Hotfix: Fix critical payment bug"

# 5. Tag hotfix
git tag -a v1.0.1 -m "Hotfix: Payment processing"

# 6. Merge to main
git checkout main
git merge hotfix/critical-bug
git push origin main
git push origin v1.0.1

# 7. Deploy automatically via CI/CD

# 8. Verify fix in production

# 9. Merge hotfix to development branch
git checkout develop
git merge hotfix/critical-bug
git push origin develop
```

---

## Performance Optimization

### 1. Caching Strategy

**Static Assets:**
```javascript
// Cloudflare automatically caches:
// - Images (1 year)
// - CSS/JS (1 year)
// - Fonts (1 year)

// Custom cache headers in astro.config.mjs
export default {
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  },
};
```

**API Response Caching:**
```typescript
// Cache course listings for 5 minutes
const cachedCourses = await redis.get('courses:all');
if (cachedCourses) {
  return JSON.parse(cachedCourses);
}

const courses = await getCourses();
await redis.setex('courses:all', 300, JSON.stringify(courses));
return courses;
```

**Database Query Caching:**
```typescript
// Use Redis for frequently accessed data
async function getPopularCourses() {
  const cacheKey = 'courses:popular';
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const courses = await pool.query(`
    SELECT * FROM courses
    WHERE is_published = true
    ORDER BY enrollment_count DESC
    LIMIT 10
  `);

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(courses.rows));
  return courses.rows;
}
```

### 2. Database Optimization

**Indexes:**
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_courses_published ON courses(is_published) WHERE is_published = true;
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_cart_user ON cart_items(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_courses_published_created ON courses(is_published, created_at DESC);

-- Full-text search index
CREATE INDEX idx_courses_search ON courses USING GIN(to_tsvector('english', title || ' ' || description));
```

**Query Optimization:**
```sql
-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE
SELECT * FROM courses
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 20;

-- Look for:
-- - Sequential scans (bad) → add indexes
-- - Index scans (good)
-- - High execution time → optimize query
```

### 3. Image Optimization

**Cloudflare Image Optimization:**
```html
<!-- Use Cloudflare's image CDN -->
<img
  src="/cdn-cgi/image/width=800,format=auto,quality=85/images/course.jpg"
  alt="Course thumbnail"
  loading="lazy"
/>
```

**Responsive Images:**
```html
<picture>
  <source
    srcset="/cdn-cgi/image/width=320/course.jpg 320w,
            /cdn-cgi/image/width=640/course.jpg 640w,
            /cdn-cgi/image/width=1024/course.jpg 1024w"
    sizes="(max-width: 320px) 320px,
           (max-width: 640px) 640px,
           1024px"
  />
  <img src="/cdn-cgi/image/width=640/course.jpg" alt="Course" />
</picture>
```

### 4. JavaScript Optimization

**Code Splitting:**
```typescript
// Lazy load components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

// Dynamic imports
const stripe = await import('@stripe/stripe-js');
```

**Minimize Bundle Size:**
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Remove unused dependencies
npm prune

# Use production builds
NODE_ENV=production npm run build
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `Connection timeout` or `ECONNREFUSED`

**Solutions:**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Must include ?sslmode=require for Neon/Supabase
postgresql://user:pass@host:5432/db?sslmode=require

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection limits
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check firewall rules in database provider dashboard
```

#### 2. Redis Connection Failed

**Error:** `ECONNREFUSED` or `Authentication required`

**Solutions:**
```bash
# Check REDIS_URL format
echo $REDIS_URL

# Must include password for Upstash
redis://default:password@host:6379

# Test connection
redis-cli -u $REDIS_URL PING

# Check connection in Upstash dashboard
```

#### 3. Stripe Webhook Errors

**Error:** `Webhook signature verification failed`

**Solutions:**
```bash
# Verify webhook secret is correct
echo $STRIPE_WEBHOOK_SECRET

# Should start with: whsec_

# Check endpoint URL in Stripe dashboard
# Must match exactly: https://yourdomain.com/api/checkout/webhook

# Test webhook
stripe trigger payment_intent.succeeded
```

#### 4. Build Failures

**Error:** `Build failed` or `Module not found`

**Solutions:**
```bash
# Clear cache
rm -rf node_modules package-lock.json dist .astro
npm install
npm run build

# Check Node version
node --version  # Should be 20+

# Check for TypeScript errors
npx tsc --noEmit

# Verify all dependencies installed
npm ls
```

#### 5. Performance Issues

**Slow page load times**

**Solutions:**
```bash
# Check Lighthouse report
npm run lighthouse

# Enable caching
# - Add cache headers
# - Use Redis for sessions
# - Cache database queries

# Optimize images
# - Use WebP format
# - Compress images
# - Use Cloudflare image optimization

# Reduce JavaScript bundle
# - Code splitting
# - Lazy loading
# - Remove unused dependencies
```

---

## Emergency Contacts

### Service Providers

**Hosting (Cloudflare Pages):**
- Support: https://support.cloudflare.com
- Status: https://www.cloudflarestatus.com
- Community: https://community.cloudflare.com

**Database (Neon):**
- Support: support@neon.tech
- Discord: https://discord.gg/neon
- Status: https://neonstatus.com

**Redis (Upstash):**
- Support: support@upstash.com
- Discord: https://discord.gg/upstash

**Payment (Stripe):**
- Support: https://support.stripe.com
- Emergency: 1-888-926-2289
- Status: https://status.stripe.com

**Email (SendGrid):**
- Support: https://support.sendgrid.com
- Phone: 1-877-969-9646

**Monitoring (Sentry):**
- Support: support@sentry.io
- Status: https://status.sentry.io

### Development Team

```
Project Lead: [name]@yourdomain.com
DevOps Lead: [name]@yourdomain.com
Database Admin: [name]@yourdomain.com
Security Lead: [name]@yourdomain.com
On-Call Engineer: [phone]
```

---

## Deployment Log Template

```markdown
# Deployment Log

**Date:** 2025-11-05
**Version:** 1.0.0
**Deployed By:** [Name]
**Environment:** Production

## Pre-Deployment
- [ ] All tests passed
- [ ] Build successful
- [ ] Database backup created
- [ ] Environment variables verified
- [ ] Security audit completed

## Deployment Steps
1. [10:00] Created database backup
2. [10:05] Ran database migrations
3. [10:10] Pushed code to main branch
4. [10:12] Cloudflare build started
5. [10:15] Build completed successfully
6. [10:16] Deployment live

## Post-Deployment
- [ ] Homepage accessible
- [ ] User flows tested
- [ ] Payment flow verified
- [ ] No errors in Sentry
- [ ] Performance metrics normal

## Issues
- None

## Rollback Plan
If issues arise:
1. Rollback to deployment: https://mystic-ecom.pages.dev/deployments/abc123
2. Restore database from: backup_20250105_100000.sql.gz

## Notes
- Smooth deployment
- All systems operational
- Monitoring active
```

---

**Document Version:** 1.0.0
**Last Updated:** November 5, 2025
**Next Review:** December 5, 2025
**Maintained By:** DevOps Team
