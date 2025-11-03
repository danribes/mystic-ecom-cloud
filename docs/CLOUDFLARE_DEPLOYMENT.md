# Cloudflare Pages Deployment Guide

Complete guide to deploying Mystic E-Commerce Platform on Cloudflare Pages.

---

## ✅ Prerequisites Completed

Your project is **already configured** for Cloudflare Pages:
- ✅ @astrojs/cloudflare adapter installed
- ✅ astro.config.mjs configured for Cloudflare
- ✅ Build tested and working
- ✅ GitHub repository published

**You're ready to deploy!**

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Go to Cloudflare Pages

Visit: **https://dash.cloudflare.com/**

- If you don't have an account, sign up (free)
- Login to your dashboard

### Step 2: Create a New Pages Project

1. Click **"Workers & Pages"** in the left sidebar
2. Click **"Create application"** button
3. Select **"Pages"** tab
4. Click **"Connect to Git"**

### Step 3: Connect to GitHub

1. Click **"Connect GitHub"**
2. Authorize Cloudflare to access your GitHub account
3. Select **"Only select repositories"**
4. Choose **`danribes/mystic-ecom`**
5. Click **"Install & Authorize"**

### Step 4: Configure Build Settings

Cloudflare should auto-detect your settings, but verify:

```
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: (leave empty)
```

**Important:** Set these environment variables before first deploy!

### Step 5: Add Environment Variables

Click **"Add environment variables"** and add these (one at a time):

#### Required Variables:

| Variable Name | Example Value | Notes |
|---------------|---------------|-------|
| `NODE_VERSION` | `20` | Must be Node 20+ |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | See Database Setup below |
| `REDIS_URL` | `redis://default:pass@host:6379` | See Redis Setup below |
| `JWT_SECRET` | `your-random-32-char-string` | Generate secure random string |

#### Payment (Stripe):

| Variable Name | Example Value |
|---------------|---------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

#### Email (SMTP):

| Variable Name | Example Value |
|---------------|---------------|
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | `noreply@yourdomain.com` |
| `EMAIL_PASSWORD` | `your-app-password` |
| `EMAIL_FROM` | `noreply@yourdomain.com` |

### Step 6: Deploy!

1. Click **"Save and Deploy"**
2. Wait 2-3 minutes for build
3. Your site will be live at: `https://mystic-ecom.pages.dev`

---

## 🗄️ Database Setup (Required)

Your app needs PostgreSQL. Choose one of these options:

### Option 1: Neon (Recommended - Free Tier)

**Why Neon?**
- Free tier with 0.5GB storage
- Serverless PostgreSQL
- Connection pooling built-in
- Perfect for Cloudflare

**Setup:**

1. Go to: https://neon.tech
2. Sign up (free)
3. Create a new project: "Mystic E-Commerce"
4. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.region.neon.tech/main`)
5. Add to Cloudflare environment variables as `DATABASE_URL`

**Run Database Schema:**

```bash
# Connect to Neon database
psql "postgresql://user:pass@ep-xxx.region.neon.tech/main?sslmode=require"

# Run schema
\i database/schema.sql

# Verify tables
\dt

# Exit
\q
```

### Option 2: Supabase (Free Tier + Auth)

1. Go to: https://supabase.com
2. Create project
3. Go to Settings → Database
4. Copy "Connection string" (Transaction mode)
5. Add to Cloudflare as `DATABASE_URL`

### Option 3: Railway ($5/month - Includes Redis)

1. Go to: https://railway.app
2. Create PostgreSQL + Redis project
3. Copy connection strings
4. Add to Cloudflare

---

## 🔴 Redis Setup (Required)

Your app needs Redis for sessions. Choose one:

### Option 1: Upstash Redis (Recommended - Free Tier)

**Why Upstash?**
- Free tier with 10,000 requests/day
- Serverless Redis
- Global edge locations
- Perfect for Cloudflare

**Setup:**

1. Go to: https://console.upstash.com/
2. Sign up (free)
3. Click **"Create Database"**
4. Name: "mystic-ecom"
5. Type: **"Regional"** (or Global for multi-region)
6. Region: Choose closest to your users
7. Click **"Create"**
8. Copy **"UPSTASH_REDIS_REST_URL"**
9. Format it as: `redis://default:YOUR_PASSWORD@endpoint.upstash.io:6379`
10. Add to Cloudflare as `REDIS_URL`

### Option 2: Railway (Includes PostgreSQL)

If you chose Railway for PostgreSQL, Redis is included:

1. In your Railway project, add Redis service
2. Copy Redis URL
3. Add to Cloudflare

---

## 🔐 Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use:
```bash
openssl rand -base64 32
```

Copy the output and add to Cloudflare as `JWT_SECRET`

---

## 📧 Email Setup (Optional but Recommended)

### Using Gmail

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Mystic E-Commerce"
   - Copy the 16-character password
3. **Add to Cloudflare:**
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

### Using SendGrid (Better for Production)

1. Sign up at: https://sendgrid.com (free tier: 100 emails/day)
2. Create API key
3. Add to Cloudflare:
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain

1. In Cloudflare Pages dashboard, go to your site
2. Click **"Custom domains"**
3. Click **"Set up a custom domain"**
4. Enter your domain: `yourdomain.com`

### If Domain is on Cloudflare DNS:

- Cloudflare automatically configures everything
- SSL certificate provisioned automatically
- Done! 🎉

### If Domain is Elsewhere:

1. Add CNAME record pointing to: `mystic-ecom.pages.dev`
2. Or change nameservers to Cloudflare (recommended)
3. Wait for DNS propagation (up to 24 hours)

---

## 🔄 Automatic Deployments

Every time you push to GitHub `main` branch, Cloudflare automatically:
1. Detects the push
2. Builds your site
3. Deploys new version
4. Takes 2-3 minutes

**Preview Deployments:**
- Every pull request gets its own preview URL
- Test before merging to production

---

## 📊 Monitoring & Logs

### View Deployment Logs

1. Go to Cloudflare Pages dashboard
2. Click on your site
3. Click **"Deployments"**
4. Click any deployment to see logs

### View Function Logs (Runtime)

1. Go to **"Functions"** tab
2. Click **"Real-time Logs"**
3. See live requests and errors

### Analytics

1. Click **"Analytics"** tab
2. See:
   - Page views
   - Unique visitors
   - Bandwidth usage
   - Geographic distribution

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Command failed: npm run build"**

**Solution:**
1. Check build logs in Cloudflare dashboard
2. Ensure `NODE_VERSION=20` is set
3. Verify `package.json` has all dependencies

**Error: "Module not found"**

**Solution:**
```bash
# Locally, clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Fails

**Error: "Connection timeout" or "SSL required"**

**Solution:**
- Neon/Supabase require `?sslmode=require` at end of connection string
- Example: `postgresql://user:pass@host:5432/db?sslmode=require`

**Error: "Too many connections"**

**Solution:**
- Use connection pooling (Neon has this built-in)
- Or use PgBouncer: `pgbouncer://user:pass@host:6543/db`

### Redis Connection Fails

**Error: "ECONNREFUSED" or "Authentication required"**

**Solution:**
- Verify Redis URL format: `redis://default:password@host:6379`
- Upstash requires password in the format shown above
- Check firewall rules in Redis dashboard

### Stripe Webhooks Not Working

**Setup Webhook Endpoint:**

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://yourdomain.pages.dev/api/checkout/webhook`
4. Events to send:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook secret
6. Add to Cloudflare as `STRIPE_WEBHOOK_SECRET`

---

## 🔒 Security Checklist

Before going live:

- [ ] Change default admin password (admin@spirituality.com / admin123)
- [ ] Use production Stripe keys (not test keys)
- [ ] Enable HTTPS only (automatic with Cloudflare)
- [ ] Set secure JWT_SECRET (32+ characters)
- [ ] Configure CORS if using external APIs
- [ ] Review environment variables (no test/dev values)
- [ ] Test payment flow end-to-end
- [ ] Setup email verification
- [ ] Enable Cloudflare firewall rules
- [ ] Setup monitoring/alerts

---

## 📈 Performance Optimization

### Enable Caching

Cloudflare automatically caches static assets. For API routes:

```javascript
// In your API endpoints
export const prerender = false; // Disable prerendering for dynamic routes
```

### Optimize Images

Use Cloudflare Image Optimization:

1. Go to Cloudflare dashboard → Images
2. Enable Image Resizing
3. Use in your code:
   ```html
   <img src="/cdn-cgi/image/width=800,format=auto/image.jpg" />
   ```

### Enable Compression

Cloudflare automatically:
- Gzips text content
- Minifies HTML/CSS/JS
- Optimizes image delivery

---

## 💰 Costs

### Free Tier Limits (Cloudflare Pages)

- **Bandwidth:** Unlimited
- **Builds:** 500 per month
- **Build time:** 20 minutes per build
- **Concurrent builds:** 1
- **Function invocations:** 100,000 requests/day
- **Function CPU time:** 10ms per request

**This is enough for:**
- Small to medium business
- Up to 10,000+ visitors/day
- Unlimited page views

### Paid Tier ($20/month)

- Unlimited builds
- Unlimited build time
- 5 concurrent builds
- 10 million requests/month
- 50ms per request

---

## 🆘 Getting Help

### Resources

- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **Astro Cloudflare Guide:** https://docs.astro.build/en/guides/deploy/cloudflare/
- **Community Discord:** https://discord.gg/cloudflare-dev

### Common Issues

**Q: My build times out after 20 minutes**

A: Optimize your build:
```json
// package.json
"scripts": {
  "build": "astro build --mode production"
}
```

**Q: Functions return 500 errors**

A: Check function logs in Cloudflare dashboard. Common issues:
- Missing environment variables
- Database connection timeout
- Redis authentication failure

**Q: How do I rollback a deployment?**

A: In Cloudflare Pages:
1. Go to Deployments
2. Find working deployment
3. Click "..." → "Rollback to this deployment"

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Visit your site: `https://mystic-ecom.pages.dev`
- [ ] Test user registration
- [ ] Test user login
- [ ] Test course browsing
- [ ] Test cart functionality
- [ ] Test checkout flow (use Stripe test card)
- [ ] Test email notifications
- [ ] Verify admin access
- [ ] Test all language switching (EN/ES)
- [ ] Check mobile responsiveness
- [ ] Test performance (should be <3s load time)

---

## 🎉 Success!

Your Mystic E-Commerce Platform is now live on Cloudflare Pages!

**Your URLs:**
- **Production:** `https://mystic-ecom.pages.dev`
- **Admin Panel:** `https://mystic-ecom.pages.dev/admin`
- **GitHub Repo:** `https://github.com/danribes/mystic-ecom`

**Next Steps:**
1. Add custom domain (optional)
2. Configure email templates
3. Add content (courses, events, products)
4. Test with real users
5. Monitor analytics
6. Scale as needed!

---

**Deployed:** 2025-11-02
**Platform:** Cloudflare Pages
**Framework:** Astro + TypeScript
**Database:** PostgreSQL (Neon/Supabase)
**Cache:** Redis (Upstash)
