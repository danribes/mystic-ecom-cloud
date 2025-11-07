# 🚀 Deployment Quick Reference Card

**Quick commands and credentials for Cloudflare Pages deployment**

---

## 📝 Step-by-Step Checklist

### Phase 1: External Services Setup (15-20 min)

#### ✅ Step 1: Neon PostgreSQL
- [ ] Go to https://neon.tech → Sign up
- [ ] Create project: `mystic-ecom-production`
- [ ] Copy connection string (with `?sslmode=require`)
- [ ] Save to credentials file

#### ✅ Step 2: Upstash Redis
- [ ] Go to https://upstash.com → Sign up
- [ ] Create database: `mystic-ecom-production`
- [ ] Enable TLS
- [ ] Copy connection URL (starts with `rediss://`)
- [ ] Save to credentials file

#### ✅ Step 3: Stripe
- [ ] Go to https://stripe.com → Sign up
- [ ] Switch to "Live mode"
- [ ] Get Secret Key and Publishable Key
- [ ] Save to credentials file
- [ ] Note: Webhook configured AFTER deployment

#### ✅ Step 4: Resend
- [ ] Go to https://resend.com → Sign up
- [ ] Create API key
- [ ] Copy API key
- [ ] Save to credentials file

#### ✅ Step 5: Generate Secrets
```bash
# Run this 4 times for each secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Save each output as:
- SESSION_SECRET
- JWT_SECRET
- CSRF_SECRET
- DOWNLOAD_TOKEN_SECRET

---

### Phase 2: Database Import (5 min)

```bash
# Set your Neon connection string
export DATABASE_URL="postgresql://user:pass@your-project.neon.tech/main?sslmode=require"

# Run import script
./scripts/import-database.sh
```

---

### Phase 3: Test Services (2 min)

```bash
# Set all environment variables in terminal
export DATABASE_URL="your-neon-url"
export REDIS_URL="your-upstash-url"
export STRIPE_SECRET_KEY="sk_live_..."
export STRIPE_PUBLISHABLE_KEY="pk_live_..."
export RESEND_API_KEY="re_..."
export SESSION_SECRET="generated-secret-1"
export JWT_SECRET="generated-secret-2"
export CSRF_SECRET="generated-secret-3"
export DOWNLOAD_TOKEN_SECRET="generated-secret-4"

# Test all connections
./scripts/test-services.sh
```

---

### Phase 4: Cloudflare Pages Deployment (10-15 min)

#### A. Create Project

1. Go to https://dash.cloudflare.com
2. **Pages** → **Create a project** → **Connect to Git**
3. Select repository: `danribes/mystic-ecom`
4. Branch: `main` (or your preferred branch)

#### B. Build Settings

```
Build command: npm run build
Build output directory: dist
Root directory: (leave empty)
Framework preset: Astro
```

#### C. Environment Variables

**In Cloudflare Pages dashboard**, add these variables:

```bash
# Core Configuration
NODE_ENV=production
NODE_VERSION=20.11.0
PUBLIC_SITE_URL=https://your-project.pages.dev

# Database & Cache
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/main?sslmode=require
REDIS_URL=rediss://default:pass@xxx.upstash.io:6379

# Security Secrets (generate with crypto)
SESSION_SECRET=your-generated-secret-1
JWT_SECRET=your-generated-secret-2
CSRF_SECRET=your-generated-secret-3
DOWNLOAD_TOKEN_SECRET=your-generated-secret-4
BCRYPT_ROUNDS=10

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_SETUP_AFTER_DEPLOYMENT

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=Mystic Ecom

# Admin
ADMIN_EMAIL=your-email@example.com

# Optional: Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBERS=whatsapp:+1234567890

# Optional: Sentry (Error Tracking)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

#### D. Deploy

Click **"Save and Deploy"** → Monitor build logs → Wait 2-5 minutes

---

### Phase 5: Post-Deployment (10 min)

#### A. Test Deployment

```bash
# Test health endpoint
curl https://your-project.pages.dev/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

#### B. Configure Stripe Webhook

1. Stripe Dashboard → **Developers** → **Webhooks**
2. **Add endpoint**
3. URL: `https://your-project.pages.dev/api/webhooks/stripe`
4. Events: Select all payment-related events
5. Copy webhook secret
6. Update `STRIPE_WEBHOOK_SECRET` in Cloudflare Pages
7. **Redeploy** the project

#### C. Test Core Features

- [ ] Homepage loads
- [ ] User registration
- [ ] User login
- [ ] Browse courses
- [ ] Add to cart
- [ ] Checkout (use test card: 4242 4242 4242 4242)
- [ ] Email notifications

---

## 🔧 Useful Commands

### Database Commands

```bash
# Connect to Neon database
psql "$DATABASE_URL"

# Check tables
psql "$DATABASE_URL" -c "\dt"

# Count users
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"

# Backup database
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

### Redis Commands

```bash
# Test Redis connection
redis-cli -u "$REDIS_URL" ping

# Get Redis info
redis-cli -u "$REDIS_URL" INFO

# Clear all Redis data (careful!)
redis-cli -u "$REDIS_URL" FLUSHALL
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `EXTERNAL_SERVICES_SETUP.md` | Detailed service setup guide |
| `CLOUDFLARE_QUICKSTART.md` | Quick deployment guide |
| `scripts/import-database.sh` | Import database schema |
| `scripts/test-services.sh` | Test all service connections |
| `.env.cloudflare.example` | Environment variables template |
| `wrangler.toml` | Cloudflare Pages configuration |

---

## 🆘 Common Issues & Fixes

### Build Fails in Cloudflare

```bash
# Check build command is correct
Build command: npm run build
Build output: dist

# Verify Node version
Add environment variable: NODE_VERSION=20.11.0
```

### Database Connection Errors

```bash
# Verify connection string format
postgresql://user:pass@host.neon.tech/main?sslmode=require
                                              ^
                                              Must include this!

# Test connection locally
psql "$DATABASE_URL" -c "SELECT 1"
```

### Redis Connection Errors

```bash
# Verify URL format (double 's')
rediss://default:pass@host.upstash.io:6379
     ^
     Must be 'rediss' not 'redis'

# Test connection
redis-cli -u "$REDIS_URL" ping
```

### 500 Internal Server Error

1. Check Cloudflare function logs
2. Verify all environment variables are set
3. Check Sentry for error details
4. Test health endpoint: `/api/health`

---

## 📞 Support Resources

| Service | Documentation | Dashboard |
|---------|--------------|-----------|
| Neon | https://neon.tech/docs | https://console.neon.tech |
| Upstash | https://docs.upstash.com | https://console.upstash.com |
| Stripe | https://stripe.com/docs | https://dashboard.stripe.com |
| Resend | https://resend.com/docs | https://resend.com/emails |
| Cloudflare | https://developers.cloudflare.com/pages | https://dash.cloudflare.com |

---

## ✅ Deployment Success Criteria

Your deployment is complete when:

- [x] Build completes without errors
- [x] `/api/health` returns healthy
- [x] All 4 external services connected
- [x] User registration works
- [x] Login works
- [x] Payments work (test mode)
- [x] Emails send successfully
- [x] No errors in Cloudflare logs
- [x] No errors in Sentry

---

## 🎯 Next Steps After Deployment

1. **Custom Domain** (Optional)
   - Add custom domain in Cloudflare Pages
   - Update DNS records
   - Update `PUBLIC_SITE_URL`

2. **Monitoring**
   - Set up UptimeRobot for uptime monitoring
   - Configure Sentry alerts
   - Monitor Cloudflare Analytics

3. **SEO**
   - Submit sitemap to Google Search Console
   - Submit sitemap to Bing Webmaster Tools
   - Verify meta tags and structured data

4. **Production Checklist**
   - Switch Stripe to live mode (if in test)
   - Configure custom email domain in Resend
   - Set up database backups
   - Enable Cloudflare WAF rules

---

**Last Updated**: 2025-11-07
**Project**: Mystic Ecom (Spirituality Platform)
**Target**: Cloudflare Pages
