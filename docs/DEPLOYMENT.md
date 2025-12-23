# Deployment Guide

This guide covers how to publish and deploy the Spirituality E-Commerce Platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Repository Setup](#github-repository-setup)
3. [Initial Publishing to GitHub](#initial-publishing-to-github)
4. [Deployment Environments](#deployment-environments)
5. [Deployment Process](#deployment-process)
6. [Environment Variables](#environment-variables)
7. [Database Migrations](#database-migrations)
8. [Continuous Deployment](#continuous-deployment)
9. [Rollback Procedures](#rollback-procedures)
10. [Monitoring](#monitoring)

---

## Prerequisites

Before publishing to GitHub and deploying, ensure you have:

- ✅ Git installed and configured
- ✅ GitHub account created
- ✅ SSH key added to GitHub (or use HTTPS with personal access token)
- ✅ All tests passing (`npm test`)
- ✅ Build succeeds (`npm run build`)
- ✅ Environment variables documented
- ✅ Database schema migrations prepared

---

## GitHub Repository Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `mystic-ecom` ✅ (already created)
3. Description: "Multilingual spirituality e-commerce platform with courses, events, and digital products"
4. Visibility: **Private** (recommended for production code)
5. **Do NOT** initialize with README, .gitignore, or license (we have these locally)
6. Click "Create repository"

### Step 2: Configure Git Remote

```bash
# Add GitHub as remote origin
git remote add origin git@github.com:danribes/mystic-ecom.git

# Or with HTTPS
git remote add origin https://github.com/danribes/mystic-ecom.git

# Verify remote
git remote -v
```

---

## Initial Publishing to GitHub

### Step 1: Initialize Git Repository (if not already done)

```bash
# Check if git is initialized
git status

# If not initialized, run:
git init
```

### Step 2: Review and Stage Files

```bash
# Check what will be committed
git status

# Review .gitignore to ensure sensitive files are excluded
cat .gitignore

# Stage all files
git add .

# Or stage selectively
git add src/ tests/ public/ docs/ package.json
```

### Step 3: Create Initial Commit

```bash
# Create commit with descriptive message
git commit -m "Initial commit: Multilingual spirituality e-commerce platform

Features:
- Multilingual support (English/Spanish) with i18n utilities
- User authentication and role-based access control
- Courses, events, and digital products management
- Translation management system for admin
- SEO optimization with hreflang and structured data
- Responsive UI with Tailwind CSS
- PostgreSQL database with soft-delete support
- Comprehensive test coverage with Vitest

Tech stack: Astro, TypeScript, PostgreSQL, Redis, Tailwind CSS"
```

### Step 4: Create Main Branch (if needed)

```bash
# Check current branch
git branch

# If on 'master', rename to 'main' (GitHub convention)
git branch -M main
```

### Step 5: Push to GitHub

```bash
# Push to GitHub (first time)
git push -u origin main

# Subsequent pushes
git push
```

### Step 6: Verify Upload

1. Go to https://github.com/danribes/mystic-ecom
2. Verify all files are present
3. Check that sensitive files (.env, credentials) are NOT uploaded

---

## Deployment Environments

### Recommended Setup

1. **Development** (Local)
   - URL: http://localhost:4321
   - Database: Local PostgreSQL
   - Purpose: Active development

2. **Staging** (Optional but recommended)
   - URL: https://staging.yourdomain.com
   - Database: Staging PostgreSQL (separate from production)
   - Purpose: Testing before production

3. **Production**
   - URL: https://yourdomain.com
   - Database: Production PostgreSQL
   - Purpose: Live user-facing site

---

## Deployment Process

### Option 1: Deploy to Vercel (Recommended for Astro)

#### Prerequisites
- Vercel account (https://vercel.com)
- Vercel CLI installed: `npm i -g vercel`

#### Steps

```bash
# Login to Vercel
vercel login

# Deploy to preview (staging)
vercel

# Deploy to production
vercel --prod
```

#### Configure Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `DATABASE_URL` → PostgreSQL connection string
   - `REDIS_URL` → Redis connection string
   - `STRIPE_SECRET_KEY` → Stripe API key
   - `STRIPE_PUBLISHABLE_KEY` → Stripe public key
   - `JWT_SECRET` → Random secure string
   - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` → SMTP settings

3. Set environment scope:
   - Production: Live site
   - Preview: Git branches
   - Development: Local dev (usually not needed in Vercel)

#### Database Setup for Vercel

**Recommended: Use managed PostgreSQL**

- **Neon** (https://neon.tech) - Serverless PostgreSQL
- **Supabase** (https://supabase.com) - PostgreSQL with auth
- **Railway** (https://railway.app) - Full stack platform
- **AWS RDS** - Enterprise solution

**Setup Steps:**

1. Create PostgreSQL database in chosen provider
2. Get connection string (format: `postgresql://user:pass@host:port/db`)
3. Add to Vercel environment variables as `DATABASE_URL`
4. Run migrations (see [Database Migrations](#database-migrations))

---

### Option 2: Deploy to VPS (DigitalOcean, Linode, etc.)

#### Prerequisites
- VPS with Ubuntu/Debian
- Node.js 20+ installed
- PostgreSQL installed
- Nginx installed
- Domain name pointed to VPS IP

#### Steps

```bash
# SSH into VPS
ssh user@your-server-ip

# Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx

# Clone repository
git clone https://github.com/danribes/mystic-ecom.git
cd mystic-ecom

# Install Node modules
npm install

# Create .env file
nano .env
# Add all environment variables

# Build the application
npm run build

# Setup PM2 for process management
npm install -g pm2
pm2 start npm --name "mystic-ecom" -- start
pm2 startup
pm2 save

# Configure Nginx (see Nginx config below)
sudo nano /etc/nginx/sites-available/mystic-ecom

# Enable site
sudo ln -s /etc/nginx/sites-available/mystic-ecom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Environment Variables

### Required Environment Variables

Create a `.env` file (NEVER commit this to Git):

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (for sessions/caching)
REDIS_URL=redis://default:password@host:6379

# JWT Authentication
JWT_SECRET=your-random-secure-string-min-32-chars

# Stripe (Payment Processing)
STRIPE_SECRET_KEY=sk_test_... (test) or sk_live_... (prod)
STRIPE_PUBLISHABLE_KEY=pk_test_... (test) or pk_live_... (prod)
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@yourdomain.com

# Application
NODE_ENV=production
PUBLIC_SITE_URL=https://yourdomain.com
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET (32+ random characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -base64 32
```

---

## Database Migrations

### Run Initial Schema

```bash
# Connect to production database
psql $DATABASE_URL

# Run schema file
\i database/schema.sql

# Verify tables created
\dt

# Exit
\q
```

### Future Migrations

Create migration files in `database/migrations/`:

```bash
database/migrations/
  001_initial_schema.sql
  002_add_user_preferences.sql
  003_add_translation_columns.sql
```

**Run migration:**

```bash
psql $DATABASE_URL -f database/migrations/002_add_user_preferences.sql
```

**Best Practice:** Use a migration tool like:
- **node-pg-migrate**: `npm install node-pg-migrate`
- **Prisma Migrate**: If using Prisma ORM
- **Knex.js**: For migration management

---

## Continuous Deployment

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}

      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Configure GitHub Secrets

1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - `VERCEL_TOKEN`: Get from Vercel dashboard
   - `VERCEL_ORG_ID`: From Vercel project settings
   - `VERCEL_PROJECT_ID`: From Vercel project settings
   - `TEST_DATABASE_URL`: Test database connection
   - `TEST_REDIS_URL`: Test Redis connection

---

## Rollback Procedures

### Vercel Rollback

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

Or via Vercel Dashboard:
1. Go to Deployments
2. Find working deployment
3. Click "..." → "Promote to Production"

### Git Rollback

```bash
# Find commit to rollback to
git log --oneline

# Create revert commit
git revert <commit-hash>
git push

# Or hard reset (dangerous, loses commits)
git reset --hard <commit-hash>
git push --force
```

### Database Rollback

**Always backup before migrations:**

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
psql $DATABASE_URL < backup_20250102_143000.sql
```

---

## Monitoring

### Application Monitoring

**Recommended Tools:**
- **Sentry** (https://sentry.io) - Error tracking
- **LogRocket** (https://logrocket.com) - Session replay
- **New Relic** (https://newrelic.com) - APM

**Setup Sentry:**

```bash
npm install @sentry/node @sentry/astro
```

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  environment: import.meta.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Database Monitoring

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Uptime Monitoring

**Recommended Services:**
- **UptimeRobot** (https://uptimerobot.com) - Free tier available
- **Pingdom** (https://pingdom.com)
- **Better Uptime** (https://betteruptime.com)

**Setup:**
1. Add website URL
2. Set check interval (5 minutes recommended)
3. Configure email/SMS alerts
4. Monitor: Homepage, API endpoints, database connectivity

---

## Quick Reference

### Deploy to Production Checklist

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Database backed up
- [ ] Run database migrations
- [ ] Update DNS if needed
- [ ] Deploy application
- [ ] Verify deployment
- [ ] Monitor error logs
- [ ] Test critical user flows

### Emergency Contacts

```
Production Issues:
- DevOps Lead: email@example.com
- Database Admin: email@example.com
- On-Call Engineer: phone-number

Service Providers:
- Hosting: support@vercel.com
- Database: support@neon.tech
- Email: support@sendgrid.com
```

---

## Additional Resources

- [Astro Deployment Docs](https://docs.astro.build/en/guides/deploy/)
- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Last Updated:** 2025-11-02
**Maintained By:** Development Team
