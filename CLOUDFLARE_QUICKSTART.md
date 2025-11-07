# Cloudflare Pages - Quick Start Deployment Guide

This guide will get your Spirituality Platform deployed to Cloudflare Pages in about 30-60 minutes.

---

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub repository pushed and up to date
- [ ] Build passes locally (`npm run build` works)
- [ ] Cloudflare account (sign up at https://cloudflare.com)
- [ ] Neon PostgreSQL account (sign up at https://neon.tech)
- [ ] Upstash Redis account (sign up at https://upstash.com)
- [ ] Stripe account for payments
- [ ] Resend account for emails

---

## 🚀 Quick Deployment Steps

### Step 1: Set Up External Services (15-20 min)

#### A. Create Neon PostgreSQL Database

1. Go to https://neon.tech and sign in
2. Click "Create Project"
3. Name it: `mystic-ecom-production`
4. Select region closest to your users
5. Copy your connection string (it includes `?sslmode=require`)
6. Import your database schema:
   ```bash
   # Use the connection string from Neon
   psql "postgresql://user:password@your-project.neon.tech/main?sslmode=require" < database/schema.sql
   ```

#### B. Create Upstash Redis Database

1. Go to https://upstash.com and sign in
2. Click "Create Database"
3. Name it: `mystic-ecom-production`
4. Select region closest to your users
5. Enable TLS
6. Copy the Redis connection URL (starts with `rediss://`)

#### C. Get Stripe API Keys

1. Go to https://dashboard.stripe.com
2. Navigate to Developers → API Keys
3. Copy your **Live mode** secret and publishable keys
4. Set up webhook endpoint (you'll get the URL after Cloudflare deployment)

#### D. Get Resend API Key

1. Go to https://resend.com
2. Create API key
3. Verify your domain for sending emails

---

### Step 2: Deploy to Cloudflare Pages (10-15 min)

#### A. Create Cloudflare Pages Project

1. Go to https://dash.cloudflare.com
2. Click "Pages" in the left sidebar
3. Click "Create a project"
4. Click "Connect to Git"
5. Select your GitHub repository: `mystic-ecom`
6. Click "Begin setup"

#### B. Configure Build Settings

Set the following:

- **Production branch**: `main` (or your preferred branch)
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave empty)

#### C. Environment Variables

Click "Add environment variables" and add:

**Framework Preset**: Select "Astro"

Add ALL variables from `.env.cloudflare.example`:

**Required Variables:**
```
NODE_ENV=production
PUBLIC_SITE_URL=https://your-project.pages.dev

# Database (from Neon)
DATABASE_URL=postgresql://user:password@your-project.neon.tech/main?sslmode=require

# Redis (from Upstash)
REDIS_URL=rediss://default:password@your-redis.upstash.io:6379

# Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=GENERATE_RANDOM_32_CHARS
JWT_SECRET=GENERATE_RANDOM_32_CHARS
CSRF_SECRET=GENERATE_RANDOM_32_CHARS
DOWNLOAD_TOKEN_SECRET=GENERATE_RANDOM_32_CHARS

# Stripe
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Email (Resend)
RESEND_API_KEY=re_YOUR_KEY
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Spirituality Platform

# Admin
ADMIN_EMAIL=admin@yourdomain.com

# Optional: Twilio for WhatsApp
TWILIO_ACCOUNT_SID=YOUR_SID
TWILIO_AUTH_TOKEN=YOUR_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBERS=whatsapp:+1234567890

# Optional: Sentry for error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

**Generate Secrets:**
```bash
# Run this 4 times to generate all secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### D. Advanced Settings

1. Under "Build settings" → "Environment variables"
2. Set **Node.js version**: `20.11.0` (add `NODE_VERSION=20.11.0`)
3. Click "Save and Deploy"

---

### Step 3: Monitor Deployment (2-5 min)

1. Cloudflare will start building your project
2. Watch the build logs for any errors
3. Build should complete in 2-5 minutes
4. You'll get a URL like: `https://mystic-ecom-abc.pages.dev`

---

### Step 4: Post-Deployment Verification (5-10 min)

#### A. Test Health Endpoint

```bash
curl https://your-project.pages.dev/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-07T...",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

#### B. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://your-project.pages.dev/api/webhooks/stripe`
4. Events to send: Select all payment events
5. Copy the webhook secret
6. Update `STRIPE_WEBHOOK_SECRET` in Cloudflare Pages environment variables
7. Redeploy the project

#### C. Test Core Functionality

Visit your site and test:
- [ ] Homepage loads
- [ ] User registration works
- [ ] Login works
- [ ] Browse courses
- [ ] Add to cart
- [ ] Checkout flow (use Stripe test card: 4242 4242 4242 4242)

---

### Step 5: Configure Custom Domain (Optional, 10 min)

1. In Cloudflare Pages → Your Project
2. Click "Custom domains"
3. Click "Set up a custom domain"
4. Enter your domain (e.g., `mystic-ecom.com`)
5. Follow DNS configuration instructions
6. Wait for SSL certificate to provision (automatic)
7. Update `PUBLIC_SITE_URL` environment variable to your custom domain
8. Redeploy

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring

1. **Uptime Monitoring**: Use UptimeRobot or similar
   - Monitor: `https://your-site.pages.dev/api/health`
   - Check interval: 5 minutes

2. **Error Tracking**: Sentry (already configured)
   - Check dashboard regularly
   - Set up alerts for critical errors

3. **Analytics**: Cloudflare Analytics (automatic)
   - View in Cloudflare dashboard

### Database Backups

Neon provides automatic backups. To manually backup:
```bash
pg_dump "postgresql://user:password@your-project.neon.tech/main?sslmode=require" > backup.sql
```

### Redis Monitoring

Monitor Redis usage in Upstash dashboard:
- Check memory usage
- Monitor command count
- Review connection errors

---

## 🐛 Troubleshooting

### Build Fails

**Check build logs** in Cloudflare Pages dashboard.

Common issues:
- Missing dependencies: Ensure `package-lock.json` is committed
- Node version: Verify `NODE_VERSION=20.11.0` is set
- Environment variables: Check all required vars are set

### Database Connection Fails

- Verify connection string has `?sslmode=require`
- Check database is running in Neon dashboard
- Test connection locally:
  ```bash
  psql "$DATABASE_URL" -c "SELECT 1"
  ```

### Redis Connection Fails

- Verify URL starts with `rediss://` (double 's' for SSL)
- Check credentials in Upstash dashboard
- Test connection:
  ```bash
  redis-cli -u "$REDIS_URL" ping
  ```

### 500 Internal Server Error

1. Check Cloudflare Pages function logs
2. Check Sentry for error details
3. Verify all environment variables are set correctly
4. Check database and Redis are accessible

---

## 📚 Additional Resources

- **Full Deployment Guide**: `docs/CLOUDFLARE_DEPLOYMENT.md`
- **Pre-Deployment Checklist**: `PRE_DEPLOYMENT_CHECKLIST.md`
- **Setup Guide**: `docs/CLOUDFLARE_SETUP_GUIDE.md`
- **Deployment Status**: `CLOUDFLARE_DEPLOYMENT_STATUS.md`

### Helpful Links

- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Neon PostgreSQL Docs: https://neon.tech/docs
- Upstash Redis Docs: https://docs.upstash.com
- Astro Cloudflare Adapter: https://docs.astro.build/en/guides/integrations-guide/cloudflare/

---

## ✅ Success Criteria

Your deployment is successful when:

- [ ] Build completes without errors
- [ ] `/api/health` returns healthy status
- [ ] Homepage loads correctly
- [ ] User registration and login work
- [ ] Database queries work
- [ ] Redis caching works
- [ ] Payment flow works with Stripe
- [ ] Emails send successfully

---

## 🎉 You're Live!

Congratulations! Your Spirituality Platform is now deployed on Cloudflare Pages.

**Next Steps:**
1. Submit sitemap to Google Search Console
2. Set up monitoring and alerts
3. Test thoroughly with real users
4. Monitor error logs and performance
5. Plan for regular backups

**Need Help?**
- Review detailed guides in `docs/` folder
- Check Cloudflare Pages documentation
- Contact Cloudflare support if needed

---

**Deployment Date**: 2025-11-07
**Status**: ✅ Ready for Production
