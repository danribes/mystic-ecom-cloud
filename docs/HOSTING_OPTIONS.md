# Hosting Options for Mystic E-Commerce Platform

This guide covers deploying your Astro application to different hosting providers.

---

## Quick Comparison

| Provider | Best For | Free Tier | Setup Difficulty | SSR Support |
|----------|----------|-----------|------------------|-------------|
| **Cloudflare Pages** | Performance, global CDN | ✅ Generous | ⭐ Easy | ✅ Yes |
| **Vercel** | Next.js ecosystem | ✅ Good | ⭐ Easy | ✅ Yes |
| **Hostinger VPS** | Full control, cheap | ❌ Paid (~$4/mo) | ⭐⭐⭐ Medium | ✅ Yes |

---

## Option 1: Cloudflare Pages (Recommended)

### Why Cloudflare?
- **Free** unlimited bandwidth
- **Global CDN** with 275+ locations
- **Fast** edge computing
- **Easy** GitHub integration
- **Reliable** 99.99% uptime

### Setup Steps

#### 1. Prepare Your Project

The Cloudflare adapter is already installed! Use the Cloudflare config:

```bash
# Copy Cloudflare config to main config
cp astro.config.cloudflare.mjs astro.config.mjs

# Test build
npm run build
```

#### 2. Deploy via Cloudflare Dashboard

1. **Go to Cloudflare Pages:**
   - Visit: https://dash.cloudflare.com/
   - Login or create account
   - Click "Workers & Pages" → "Create application" → "Pages"

2. **Connect to GitHub:**
   - Click "Connect to Git"
   - Authorize Cloudflare
   - Select repository: `danribes/mystic-ecom`

3. **Configure Build Settings:**
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: (leave empty)
   ```

4. **Set Environment Variables:**
   - Click "Settings" → "Environment variables"
   - Add these variables:

   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   REDIS_URL=redis://host:6379
   JWT_SECRET=your-secret-key-min-32-chars
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=noreply@yourdomain.com
   EMAIL_PASSWORD=your-password
   EMAIL_FROM=noreply@yourdomain.com
   NODE_VERSION=20
   ```

5. **Deploy:**
   - Click "Save and Deploy"
   - Wait 2-3 minutes for build
   - Get your URL: `https://mystic-ecom.pages.dev`

#### 3. Custom Domain (Optional)

1. In Cloudflare Pages dashboard, go to "Custom domains"
2. Add your domain (must be on Cloudflare DNS)
3. Automatic SSL certificate provisioning

### Cloudflare Limitations

⚠️ **Important:** Cloudflare Workers have limitations:
- **No native Node.js modules** in edge runtime
- **PostgreSQL connections** need connection pooler (use Supabase, Neon, or PgBouncer)
- **Redis** works via Cloudflare KV or Upstash Redis
- **File uploads** need external storage (Cloudflare R2, S3)

**Recommended Services for Cloudflare:**
- Database: **Neon** (https://neon.tech) - Serverless PostgreSQL
- Redis: **Upstash** (https://upstash.com) - Serverless Redis
- Storage: **Cloudflare R2** or **AWS S3**

---

## Option 2: Vercel

### Setup for Vercel

#### 1. Install Vercel Adapter

```bash
npm install @astrojs/vercel
```

#### 2. Update astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://mystic-ecom.vercel.app',
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind({ applyBaseStyles: false })],
});
```

#### 3. Deploy

**Option A: Via Website**
1. Go to https://vercel.com/new
2. Import from GitHub: `danribes/mystic-ecom`
3. Add environment variables
4. Deploy

**Option B: Via CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## Option 4: Hostinger VPS (Traditional Hosting)

### Why Hostinger VPS?
- **Cheap** (~$4-8/month)
- **Full control** over server
- **SSH access**
- **Good for learning** server management

### Requirements
- VPS plan (minimum 2GB RAM recommended)
- Domain name (optional, can use IP)
- Basic Linux knowledge helpful

### Setup Steps

#### 1. Purchase Hostinger VPS

1. Go to: https://www.hostinger.com/vps-hosting
2. Choose plan (KVM 2 recommended - $7.99/mo)
3. Set root password during setup

#### 2. Connect via SSH

```bash
ssh root@your-vps-ip
```

#### 3. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install Nginx (web server)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Certbot (SSL certificates)
apt install -y certbot python3-certbot-nginx
```

#### 4. Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE mystic_ecom;
CREATE USER mystic_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE mystic_ecom TO mystic_user;
\q
```

#### 5. Clone and Setup Project

```bash
# Clone your repository
cd /var/www
git clone https://github.com/danribes/mystic-ecom.git
cd mystic-ecom

# Install dependencies
npm install

# Create .env file
nano .env
```

Paste your environment variables:
```bash
DATABASE_URL=postgresql://mystic_user:your-password@localhost:5432/mystic_ecom
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
NODE_ENV=production
```

#### 6. Run Database Migrations

```bash
psql $DATABASE_URL < database/schema.sql
```

#### 7. Build and Start Application

```bash
# Build the project
npm run build

# Start with PM2
pm2 start npm --name "mystic-ecom" -- start
pm2 startup
pm2 save
```

#### 8. Configure Nginx as Reverse Proxy

```bash
nano /etc/nginx/sites-available/mystic-ecom
```

Paste this configuration:
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/mystic-ecom /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 9. Setup SSL Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 10. Setup Automatic Deployments (Optional)

Create a deploy script:
```bash
nano /var/www/mystic-ecom/deploy.sh
```

```bash
#!/bin/bash
cd /var/www/mystic-ecom
git pull origin main
npm install
npm run build
pm2 restart mystic-ecom
```

Make it executable:
```bash
chmod +x deploy.sh
```

### Hostinger VPS Management

**Start/Stop Application:**
```bash
pm2 start mystic-ecom
pm2 stop mystic-ecom
pm2 restart mystic-ecom
pm2 logs mystic-ecom
```

**Update Application:**
```bash
cd /var/www/mystic-ecom
./deploy.sh
```

**Monitor Resources:**
```bash
htop  # CPU/RAM usage
pm2 monit  # Application monitoring
```

---

## Recommended Hosting by Use Case

### For Development/Testing
→ **Cloudflare Pages** (free, easy, fast deploys)

### For Production (Small-Medium Business)
→ **Cloudflare Pages** (free, global CDN, excellent performance)

### For Production (Need Full Control)
→ **Hostinger VPS** (cheap, full control, learning opportunity)

### For Enterprise
→ **AWS/GCP/Azure** with Kubernetes (expensive, highly scalable)

---

## Database & Redis Hosting

Since your app needs PostgreSQL and Redis, here are options:

### Free/Cheap Database Options:
1. **Neon** (https://neon.tech) - Free tier, serverless PostgreSQL
2. **Supabase** (https://supabase.com) - Free tier, PostgreSQL with auth
3. **Railway** (https://railway.app) - $5/month, PostgreSQL + Redis
4. **ElephantSQL** (https://elephantsql.com) - Free tier PostgreSQL

### Redis Options:
1. **Upstash** (https://upstash.com) - Free tier, serverless Redis
2. **Redis Cloud** (https://redis.com) - Free 30MB tier
3. **Railway** (includes Redis with PostgreSQL)

### For Hostinger VPS:
- Run PostgreSQL and Redis **on the same VPS** (saves money)
- Requires at least 2GB RAM

---

## Cost Comparison (Monthly)

| Setup | Cost | Includes |
|-------|------|----------|
| **Cloudflare + Neon + Upstash** | **$0** | Free tiers |
| **Hostinger VPS (all-in-one)** | **$8** | VPS, DB, Redis |
| **Railway (all-in-one)** | **$5** | Hosting, DB, Redis |
| **Vercel + managed services** | **$20-40** | Pro hosting, DB, Redis |

---

## Deployment Checklist

- [ ] Choose hosting provider
- [ ] Setup database (PostgreSQL)
- [ ] Setup Redis cache
- [ ] Configure environment variables
- [ ] Update site URL in astro.config.mjs
- [ ] Test build locally (`npm run build`)
- [ ] Deploy application
- [ ] Run database migrations
- [ ] Setup custom domain (optional)
- [ ] Setup SSL certificate
- [ ] Configure email (SMTP)
- [ ] Test critical user flows
- [ ] Setup monitoring/alerts

---

## Getting Help

- **Cloudflare:** https://developers.cloudflare.com/pages/
- **Vercel:** https://vercel.com/docs
- **Hostinger:** https://www.hostinger.com/tutorials/
- **Astro Docs:** https://docs.astro.build/en/guides/deploy/

---

**Last Updated:** 2025-11-02
