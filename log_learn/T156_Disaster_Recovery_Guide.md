# T156: Disaster Recovery - Learning Guide

**Task**: Create disaster recovery procedures
**Date**: November 6, 2025
**Difficulty**: Advanced
**Technologies**: Disaster Recovery, Business Continuity, DevOps

---

## Table of Contents

1. [Introduction](#introduction)
2. [Why Disaster Recovery Matters](#why-disaster-recovery-matters)
3. [Key Concepts](#key-concepts)
4. [Understanding RTO and RPO](#understanding-rto-and-rpo)
5. [Disaster Scenarios](#disaster-scenarios)
6. [Recovery Procedures](#recovery-procedures)
7. [DR Automation](#dr-automation)
8. [Best Practices](#best-practices)
9. [Testing Your DR Plan](#testing-your-dr-plan)
10. [Real-World Examples](#real-world-examples)

---

## Introduction

This guide teaches you how to create and maintain disaster recovery (DR) procedures for production applications. You'll learn why DR is critical, how to plan for different disaster scenarios, and how to automate DR readiness checks.

### What You'll Learn

- Why disaster recovery is business-critical
- How to define recovery objectives (RTO/RPO)
- Creating runbooks for different disasters
- Automating DR readiness checks
- Testing and maintaining DR procedures
- Real-world disaster recovery scenarios

### Prerequisites

- Understanding of system architecture
- Basic knowledge of databases and backups
- Command line proficiency
- Understanding of production deployments

---

## Why Disaster Recovery Matters

### The Reality of Disasters

**Disasters happen** - It's not a question of "if" but "when":

```
💥 Hardware Failure: 1 in 100 servers per year
🔥 Data Center Outage: Average 2 hours per year
🐛 Software Bug: Causes outage in 40% of applications
👤 Human Error: Accounts for 50% of incidents
🦠 Security Breach: 1 in 3 companies per year
```

### Cost of Downtime

**Financial Impact**:
```
Small Business ($1M revenue):
  1 hour downtime = $140 lost revenue
  1 day downtime = $3,360 lost revenue
  1 week downtime = $23,520 lost revenue + customer trust

Medium Business ($10M revenue):
  1 hour downtime = $1,400 lost revenue
  1 day downtime = $33,600 lost revenue
  1 week downtime = $235,200 lost revenue + reputation damage

Enterprise ($100M+ revenue):
  1 hour downtime = $100,000+ lost revenue
  1 day downtime = $2.4M+ lost revenue
  1 week downtime = Business-ending event
```

### Without DR Plan

**Scenario**: E-commerce database corrupted at 2 PM on Black Friday

```
Without DR Plan:
├─ 2:00 PM: Database corrupted, site down
├─ 2:15 PM: Team realizes there's a problem
├─ 2:30 PM: Emergency meeting called
├─ 3:00 PM: Trying to figure out what happened
├─ 4:00 PM: Looking for backups
├─ 5:00 PM: Found backup from 2 weeks ago (outdated!)
├─ 6:00 PM: Trying to restore, encountering errors
├─ 8:00 PM: Still down, customers angry, going to competitors
├─ 11:00 PM: Finally restored with 2 weeks of data lost
Result:
  - 9 hours downtime
  - $126,000 lost sales (Black Friday)
  - 500+ angry customers
  - Reputation damaged
  - Data loss
```

### With DR Plan

**Same Scenario with DR Plan**:

```
With DR Plan:
├─ 2:00 PM: Database corrupted, site down
├─ 2:05 PM: Automated alert triggers
├─ 2:10 PM: On-call engineer opens DR runbook
├─ 2:15 PM: Follows step-by-step recovery procedure
│   1. Identify latest backup (1 hour old)
│   2. Create new database instance
│   3. Restore from backup
│   4. Update connection strings
│   5. Verify data integrity
│   6. Switch traffic to new database
├─ 2:45 PM: Site back online
Result:
  - 45 minutes downtime
  - $1,050 lost sales
  - Lost only last hour of transactions
  - Customers experience brief interruption
  - Business continues normally
```

**Savings**: $124,950 + customer trust + reputation

---

## Key Concepts

### 1. Disaster vs Incident

**Incident**:
```
Minor issue with limited impact
- Single service degradation
- Temporary performance issue
- Affects small percentage of users
- Self-correcting or quick fix

Example: One API endpoint slow
Recovery: Restart service, done
```

**Disaster**:
```
Major event requiring DR procedures
- Complete service outage
- Data loss or corruption
- Multiple systems affected
- Requires significant recovery effort

Example: Database server destroyed
Recovery: Follow DR runbook, 2-4 hours
```

**Our Focus**: Planning for disasters, not incidents

---

### 2. Recovery Time Objective (RTO)

**Definition**: Maximum acceptable time to restore service after disaster

**Analogy**: "How long can we be down before it becomes a crisis?"

**Example RTO Targets**:

```
Critical Services (RTO: 15-30 minutes):
├─ Database
├─ Payment Processing
├─ User Authentication
└─ Core API

Why: Revenue loss, customer impact, SLA violations

High Priority (RTO: 30-60 minutes):
├─ Application Server
├─ Admin Dashboard
└─ Core Features

Why: Significant business impact, user frustration

Medium Priority (RTO: 2-4 hours):
├─ Analytics
├─ Reporting
└─ Marketing Features

Why: Non-critical, can wait without major impact
```

**Setting RTO**:
```
RTO = Revenue Impact + Customer Impact + SLA Requirements

Example: E-commerce checkout
  Revenue Impact: $1,000/hour
  Customer Impact: High (abandoned carts)
  SLA: 99.9% uptime (43 minutes/month max)
  → RTO: 15 minutes
```

---

### 3. Recovery Point Objective (RPO)

**Definition**: Maximum acceptable data loss (time between backup and failure)

**Analogy**: "How much data can we afford to lose?"

**Example RPO Targets**:

```
Transactional Data (RPO: 1 hour):
├─ Orders
├─ Payments
└─ User Actions

Backup Strategy: Hourly backups
Why: Financial data, cannot lose transactions

User Data (RPO: 4 hours):
├─ Profile Updates
├─ Cart Contents
└─ Preferences

Backup Strategy: Every 6 hours
Why: User frustration, but not financial loss

Configuration (RPO: 24 hours):
├─ System Settings
├─ Feature Flags
└─ Static Content

Backup Strategy: Daily backups
Why: Rarely changes, easy to recreate
```

**Setting RPO**:
```
RPO = Data Criticality + Recovery Cost + Backup Cost

Example: Payment transactions
  Data Criticality: High (financial data)
  Recovery Cost: Impossible (cannot recreate)
  Backup Cost: Low (incremental backups)
  → RPO: 1 hour (hourly backups)
```

---

### 4. Runbook

**Definition**: Step-by-step procedure document for disaster recovery

**Analogy**: "Emergency manual for when things go wrong"

**Good Runbook Structure**:
```markdown
## Disaster: Database Failure

### Symptoms
- Application shows database errors
- Health check fails
- Users cannot access site

### Impact
- Complete service outage
- No revenue
- Customer complaints

### Recovery Procedure

#### Prerequisites
- [ ] Access to backup system
- [ ] Database credentials
- [ ] Cloud provider access

#### Step 1: Assess the Situation (2 min)
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"
```
Expected result: Connection error

#### Step 2: Create New Database (5 min)
```bash
# Create new database instance
neon projects create --name recovery-db
```
Expected result: New database URL

#### Step 3: Restore Backup (10 min)
```bash
# List backups
npm run backup:list

# Restore latest backup
pg_restore -d [NEW_DATABASE_URL] backup.dump
```
Expected result: Backup restored successfully

### Verification
- [ ] Database accessible
- [ ] Table count matches
- [ ] Sample queries work
- [ ] Application connects

### Estimated Recovery Time
15-30 minutes
```

**Why This Works**:
- Clear symptoms (know when to use it)
- Step-by-step commands (copy-paste ready)
- Expected results (know if it's working)
- Verification checklist (confirm success)
- Time estimate (set expectations)

---

## Understanding RTO and RPO

### RTO Deep Dive

**RTO Components**:
```
Total RTO = Detection + Response + Recovery + Verification

Example: Database Failure
  Detection: 5 minutes (automated monitoring)
  Response: 5 minutes (engineer reviews runbook)
  Recovery: 20 minutes (restore from backup)
  Verification: 10 minutes (test functionality)
  ─────────────────────────────────────────
  Total RTO: 40 minutes
```

**Improving RTO**:

1. **Faster Detection** (5 min → 1 min):
```bash
# Better monitoring
# Alert when database check fails 3 times in 30 seconds
```

2. **Faster Response** (5 min → 2 min):
```bash
# Clear runbook with copy-paste commands
# Automated DR checks ensure readiness
```

3. **Faster Recovery** (20 min → 10 min):
```bash
# Automation: One-click restore
# Hot standby: Pre-configured backup instance
```

4. **Faster Verification** (10 min → 5 min):
```bash
# Automated health checks
# Pre-defined test queries
```

**Result**: 40 min → 18 min RTO

---

### RPO Deep Dive

**RPO vs Backup Frequency**:

```
Backup Frequency = RPO

Examples:

Hourly Backups:
├─ Backup at: 1:00 AM, 2:00 AM, 3:00 AM...
├─ Disaster at: 2:45 AM
├─ Latest backup: 2:00 AM
└─ Data loss: 45 minutes ✅ Meets 1-hour RPO

Daily Backups:
├─ Backup at: 2:00 AM daily
├─ Disaster at: 1:00 PM
├─ Latest backup: 2:00 AM
└─ Data loss: 11 hours ❌ Exceeds 1-hour RPO
```

**Improving RPO**:

1. **More Frequent Backups**:
```
Daily backups (RPO: 24 hours)
  → Hourly backups (RPO: 1 hour)
  → 15-minute backups (RPO: 15 minutes)
```

2. **Continuous Replication**:
```
Point-in-time recovery (RPO: seconds)
- Database continuously logs changes
- Can restore to any second
- Example: PostgreSQL WAL archiving
```

3. **Multi-Region Replication**:
```
Hot standby in different region
- Real-time data sync
- Instant failover
- RPO: Near zero
```

---

## Disaster Scenarios

### Scenario 1: Database Failure

**What Happened**: Database server hardware failure

**Symptoms**:
```
🔴 Application logs:
   Error: Connection refused (ECONNREFUSED)
   Error: Unable to connect to database

🔴 Health check:
   GET /api/health → 500 Internal Server Error

🔴 User experience:
   "500 - Internal Server Error"
   Site completely down
```

**Impact**:
- **Severity**: Critical
- **Services Affected**: All
- **Revenue Impact**: 100% (complete outage)
- **Customer Impact**: Severe (cannot use site)

**Recovery Steps**:

```bash
# Step 1: Verify database is down (2 min)
psql $DATABASE_URL -c "SELECT 1"
# Expected: Connection error

# Step 2: Check backup availability (1 min)
npm run backup:list
# Expected: List of recent backups

# Step 3: Create new database instance (5 min)
neon projects create --name spirituality-recovery
# Expected: New database URL

# Step 4: Restore from latest backup (10 min)
pg_restore -h [new-host] -d [database] -c -v backup.dump
# Expected: Restoration progress, then complete

# Step 5: Update environment variables (5 min)
# In Cloudflare Pages settings:
# DATABASE_URL = [new-database-url]
# Save and redeploy

# Step 6: Verify recovery (5 min)
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Expected: User count matches expected value

curl https://yourdomain.com/api/health
# Expected: 200 OK

# Step 7: Monitor (ongoing)
# Watch error logs for any issues
```

**Total Recovery Time**: 15-30 minutes
**Data Loss**: Up to 1 hour (last backup)

---

### Scenario 2: Application Deployment Failure

**What Happened**: Bad code deployed to production

**Symptoms**:
```
🔴 Application logs:
   TypeError: Cannot read property 'x' of undefined
   UnhandledPromiseRejection: ...

🔴 User experience:
   Blank page or error message
   Some features broken
```

**Impact**:
- **Severity**: High
- **Services Affected**: Application only (database OK)
- **Revenue Impact**: High (users cannot complete actions)
- **Customer Impact**: Moderate (some features work)

**Recovery Steps**:

```bash
# Step 1: Identify bad deployment (2 min)
wrangler pages deployments list
# Find the deployment that caused issues

# Step 2: Rollback to previous version (5 min)
wrangler pages deployment create --rollback
# Or redeploy previous commit:
git revert HEAD
git push origin main

# Step 3: Verify rollback (3 min)
curl https://yourdomain.com/api/health
# Expected: 200 OK

# Test critical features
# - User login
# - Checkout process
# - Product browsing

# Step 4: Fix code issue (varies)
# Fix the bug in development
# Test thoroughly
# Deploy fix when ready
```

**Total Recovery Time**: 10-30 minutes
**Data Loss**: None (database unaffected)

---

### Scenario 3: Complete Infrastructure Loss

**What Happened**: Entire cloud region down

**Symptoms**:
```
🔴 All services unreachable:
   DNS: Cannot resolve domain
   Application: Not responding
   Database: Not accessible
   Redis: Not accessible
```

**Impact**:
- **Severity**: Critical
- **Services Affected**: Everything
- **Revenue Impact**: 100%
- **Customer Impact**: Severe

**Recovery Steps**:

```bash
# Step 1: Verify complete outage (5 min)
ping yourdomain.com
# Expected: Timeout

dig yourdomain.com
# Check if DNS resolving

# Step 2: Create new infrastructure (60 min)

# 2a. Create new database
neon projects create --name spirituality-recovery
# Note new DATABASE_URL

# 2b. Restore database
pg_restore -d $NEW_DATABASE_URL backup.dump

# 2c. Create new Redis instance
# Use Upstash console
# Note new REDIS_URL

# 2d. Deploy application to new region
# Push to GitHub (triggers Cloudflare Pages deploy)
git push origin main

# Step 3: Update DNS (30 min propagation)
# In Cloudflare DNS settings:
# Point A/AAAA records to new infrastructure
# Wait for DNS propagation

# Step 4: Verify all services (15 min)
npm run dr:verify

# Check each service individually:
psql $DATABASE_URL -c "SELECT 1"
redis-cli -u $REDIS_URL PING
curl https://yourdomain.com/api/health
```

**Total Recovery Time**: 2-4 hours
**Data Loss**: Up to 1 hour (last backup)

---

## Recovery Procedures

### Database Recovery (Detailed)

**Scenario**: PostgreSQL database corrupted or lost

**Prerequisites**:
```bash
# 1. Have backups (critical!)
npm run backup:list

# 2. Have PostgreSQL tools installed
which pg_restore
which psql

# 3. Have database credentials
echo $DATABASE_URL
```

**Step-by-Step Recovery**:

#### Phase 1: Assessment (5 minutes)

```bash
# Test current database
psql $DATABASE_URL -c "SELECT 1"

# If connection works but data corrupted:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Compare with expected count

# If count is wrong, corruption confirmed
```

#### Phase 2: Backup Selection (2 minutes)

```bash
# List all backups
npm run backup:list

# Output example:
# 1. mydb_2025-11-06_14-00-00.dump (15.2 MB) - 1 hour ago
# 2. mydb_2025-11-06_12-00-00.dump (15.1 MB) - 3 hours ago
# 3. mydb_2025-11-06_06-00-00.dump (14.9 MB) - 9 hours ago

# Choose most recent backup
# Trade-off: Recency vs data integrity
#   - Newest backup: Less data loss
#   - Older backup: More reliable (time-tested)

# Usually choose newest unless suspected backup corruption
```

#### Phase 3: Create New Database (10 minutes)

**Option A: Cloud Provider (Recommended)**
```bash
# Neon PostgreSQL
neon projects create --name spirituality-recovery

# AWS RDS
aws rds create-db-instance \
  --db-instance-identifier spirituality-recovery \
  --db-instance-class db.t3.micro \
  --engine postgres

# Record new database URL
NEW_DATABASE_URL="postgresql://user:pass@new-host:5432/newdb"
```

**Option B: Same Server (if available)**
```bash
# Create new database on same server
createdb spirituality_recovery

NEW_DATABASE_URL="postgresql://user:pass@host:5432/spirituality_recovery"
```

#### Phase 4: Restore Backup (15 minutes)

```bash
# Full restore (recommended)
pg_restore \
  -d $NEW_DATABASE_URL \
  -c \
  -v \
  backups/mydb_2025-11-06_14-00-00.dump

# Options explained:
# -d: Target database URL
# -c: Clean (drop existing objects first)
# -v: Verbose (show progress)

# For large databases, use parallel restore:
pg_restore \
  -d $NEW_DATABASE_URL \
  -c \
  -v \
  -j 4 \
  backups/mydb_2025-11-06_14-00-00.dump
# -j 4: Use 4 parallel jobs (faster)
```

**Monitor Progress**:
```bash
# In another terminal, watch database size
watch -n 5 "psql $NEW_DATABASE_URL -c 'SELECT pg_size_pretty(pg_database_size(current_database()));'"

# Expected output:
# 0 MB → 5 MB → 10 MB → 15 MB (complete)
```

#### Phase 5: Verification (10 minutes)

```bash
# 1. Check table count
psql $NEW_DATABASE_URL -c "\dt" | wc -l
# Expected: Match original table count

# 2. Check row counts
psql $NEW_DATABASE_URL << EOF
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;
EOF

# Expected: Reasonable counts (compare with records)

# 3. Test critical queries
psql $NEW_DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
psql $NEW_DATABASE_URL -c "SELECT * FROM products WHERE id = 1;"

# Expected: Data returns successfully

# 4. Check data integrity
psql $NEW_DATABASE_URL << EOF
-- Check for orphaned records (foreign key violations)
SELECT 'orders_without_users' as issue, COUNT(*)
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;
EOF

# Expected: 0 (no orphaned records)
```

#### Phase 6: Application Update (10 minutes)

```bash
# Update environment variables

# Cloudflare Pages:
wrangler pages secret put DATABASE_URL
# Enter new database URL when prompted

# Vercel:
vercel env add DATABASE_URL
# Enter new database URL

# Cloudflare Pages:
# Update DATABASE_URL in Cloudflare Pages Dashboard → Settings → Environment Variables

# Trigger redeployment
git commit --allow-empty -m "Trigger redeploy after database recovery"
git push origin main
```

#### Phase 7: Final Verification (5 minutes)

```bash
# Test application health
curl https://yourdomain.com/api/health
# Expected: 200 OK with database status "healthy"

# Test critical functionality
curl https://yourdomain.com/api/users/me \
  -H "Authorization: Bearer [test-token]"
# Expected: User data returned

# Monitor logs
wrangler pages deployment tail
# Watch for any database errors
```

**Recovery Complete!**

**Post-Recovery Checklist**:
- ✅ Database restored
- ✅ Application connected
- ✅ Data integrity verified
- ✅ Critical features working
- ✅ Monitoring active
- ✅ Stakeholders notified

**Document Incident**:
```markdown
## Incident Report: Database Corruption

**Date**: 2025-11-06
**Time**: 14:30 UTC
**Severity**: Critical
**Duration**: 45 minutes

### What Happened
Database became corrupted due to [reason].

### Impact
- Complete service outage
- 45 minutes downtime
- Lost 1 hour of data (since last backup)
- Affected: All users

### Recovery
- Restored from backup: mydb_2025-11-06_14-00-00.dump
- Created new database instance
- Updated application configuration
- Verified data integrity

### Lessons Learned
- Backup system worked perfectly
- DR runbook was accurate and helpful
- Consider more frequent backups (hourly → every 30 min)

### Action Items
- [ ] Increase backup frequency
- [ ] Add database health monitoring
- [ ] Schedule DR drill for next month
```

---

## DR Automation

### Why Automate DR Checks?

**Manual DR Checks**:
```
❌ Time-consuming (30 minutes per check)
❌ Error-prone (humans miss things)
❌ Inconsistent (different each time)
❌ Rarely done (too much work)
```

**Automated DR Checks**:
```
✅ Fast (1-2 seconds)
✅ Accurate (computer follows checklist)
✅ Consistent (same checks every time)
✅ Frequent (run daily/weekly)
```

### DR Check Automation

**Our Implementation**:

```bash
# Run comprehensive DR readiness check
tsx src/scripts/dr.ts check
```

**What It Checks**:

1. **Environment Variables** (Critical)
```typescript
// Check: DATABASE_URL is set
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  return { status: 'fail', message: 'DATABASE_URL not set', critical: true };
}
```

2. **Backup System** (Critical)
```typescript
// Check: Backup files exist
const backupLibExists = existsSync('src/lib/backup.ts');
const backupScriptExists = existsSync('src/scripts/backup.ts');
if (!backupLibExists || !backupScriptExists) {
  return { status: 'fail', message: 'Backup system files missing', critical: true };
}
```

3. **Backup Files** (Critical)
```typescript
// Check: Recent backups exist
const backups = await listBackups();
if (backups.length === 0) {
  return { status: 'fail', message: 'No backups found!', critical: true };
}

const latestBackup = backups[0];
const ageHours = (Date.now() - latestBackup.created.getTime()) / (1000 * 60 * 60);
if (ageHours > 24) {
  return { status: 'warn', message: `Latest backup is ${ageHours} hours old`, critical: false };
}
```

4. **PostgreSQL Tools** (Critical)
```typescript
// Check: pg_dump available
const available = await checkPgDumpAvailable();
if (!available) {
  return { status: 'fail', message: 'pg_dump not found', critical: true };
}
```

5. **Database Connectivity** (Critical)
```typescript
// Check: Can connect to database
try {
  await execAsync(`psql "${dbUrl}" -c "SELECT 1"`);
  return { status: 'pass', message: 'Database accessible', critical: true };
} catch (error) {
  return { status: 'fail', message: 'Cannot connect to database', critical: true };
}
```

6. **Redis Connectivity** (Non-Critical)
```typescript
// Check: Can connect to Redis
try {
  await execAsync(`redis-cli -u "${redisUrl}" PING`);
  return { status: 'pass', message: 'Redis accessible', critical: false };
} catch (error) {
  return { status: 'warn', message: 'Cannot connect to Redis', critical: false };
}
```

7. **DR Documentation** (Non-Critical)
```typescript
// Check: DR runbook exists
const runbookExists = existsSync('docs/DISASTER_RECOVERY_RUNBOOK.md');
if (!runbookExists) {
  return { status: 'warn', message: 'DR runbook not found', critical: false };
}
```

8. **Monitoring Setup** (Non-Critical)
```typescript
// Check: Sentry configured
const sentryConfigured = !!process.env.SENTRY_DSN;
if (!sentryConfigured) {
  return { status: 'warn', message: 'Sentry not configured', critical: false };
}
```

### Automation Schedule

**Recommended**:
```cron
# Daily DR check at 6 AM
0 6 * * * cd /app && tsx src/scripts/dr.ts check >> /var/log/dr-check.log

# Alert on failure
0 6 * * * cd /app && tsx src/scripts/dr.ts check || curl -X POST https://alerts.example.com/dr-check-failed
```

**Result**: Know immediately if DR readiness degrades

---

## Best Practices

### 1. Document Everything

**Good Runbook**:
```markdown
✅ Clear symptoms
✅ Step-by-step commands
✅ Expected results
✅ Verification steps
✅ Time estimates
✅ Contact information
```

**Bad Runbook**:
```markdown
❌ "Restore the database"
❌ No commands
❌ No verification
❌ Vague steps
```

### 2. Test Your DR Plan

**Recommended Testing Schedule**:

```
Monthly: Backup Restoration Test
  - Restore latest backup to staging
  - Verify data integrity
  - Time the recovery process
  - Update runbook with findings

Quarterly: Disaster Simulation
  - Simulate database failure
  - Follow DR runbook
  - Time full recovery
  - Identify gaps

Annually: Full DR Drill
  - Complete infrastructure loss scenario
  - Full team participation
  - Test all runbooks
  - Update all documentation
```

**Why Test?**:
```
Untested DR Plan = No DR Plan

Reality:
  - Commands become outdated
  - Tools change
  - Passwords expire
  - Steps are missing
  - Assumptions are wrong

Testing reveals problems BEFORE disaster
```

### 3. Keep It Simple

**Complex DR Plan (Bad)**:
```bash
# Step 1: SSH into backup server
ssh backup-server

# Step 2: Find backup
cd /backups
ls -lh | grep $(date -d "yesterday" +%Y%m%d)

# Step 3: Copy to recovery server
scp backup.dump recovery-server:/tmp

# Step 4: SSH into recovery server
ssh recovery-server

# Step 5: Import backup
cd /tmp
pg_restore ...

# Too many steps, too many manual actions
```

**Simple DR Plan (Good)**:
```bash
# One command to restore
npm run backup:restore --latest

# Automated script handles:
# - Finding latest backup
# - Creating new database
# - Restoring data
# - Verification
# - Updating configuration
```

### 4. Automate Common Tasks

**Automate**:
- ✅ Backup creation (daily cron)
- ✅ Backup cleanup (retention policy)
- ✅ DR readiness checks (daily checks)
- ✅ Health monitoring (continuous)
- ✅ Alert notifications (immediate)

**Manual** (Require human judgment):
- ⚠️ Disaster assessment (what happened?)
- ⚠️ Recovery decision (which backup to use?)
- ⚠️ Communication (notify stakeholders)
- ⚠️ Post-recovery analysis (why did it happen?)

### 5. Have Multiple Backups

**Single Backup (Risky)**:
```
Only one backup:
  - If backup is corrupted → No recovery
  - If backup is too old → Major data loss
```

**Multiple Backups (Safe)**:
```
10 backups kept:
  - Latest backup corrupted? → Use second newest
  - Need older data? → Have 10 options
  - Backup system failed? → Still have several backups
```

**Our Retention Policy**:
```bash
# Keep 10 most recent backups OR 30 days
BACKUP_RETENTION_COUNT=10
BACKUP_RETENTION_DAYS=30
```

### 6. Store Backups Off-Site

**On-Site Only (Dangerous)**:
```
Server hosting:
  - Application
  - Database
  - Backups ← ⚠️ Same server!

Disaster (fire, flood, hardware failure):
  - Application destroyed
  - Database destroyed
  - Backups destroyed ← Everything lost!
```

**Off-Site Backups (Safe)**:
```
Server A:
  - Application
  - Database

Server B (different location):
  - Backup copies

Disaster on Server A:
  - Application destroyed
  - Database destroyed
  - Backups safe on Server B ← Can recover!
```

**Implementation**:
```bash
# After local backup, copy to S3
npm run backup
aws s3 cp backups/latest.dump s3://my-backups/

# Or use automated sync
aws s3 sync backups/ s3://my-backups/ --delete
```

---

## Testing Your DR Plan

### Monthly Backup Test

**Procedure**:
```bash
# 1. Create staging database
createdb spirituality_staging

# 2. Restore latest production backup
pg_restore -d spirituality_staging backup.dump

# 3. Verify data
psql spirituality_staging -c "SELECT COUNT(*) FROM users;"

# 4. Test critical queries
# ... run test queries ...

# 5. Cleanup
dropdb spirituality_staging

# 6. Document results
# - Time taken: X minutes
# - Issues found: None
# - Runbook updates: None needed
```

**Time**: 30 minutes
**Frequency**: Monthly

### Quarterly DR Drill

**Procedure**:
```
1. Schedule drill (with team)
2. Simulate disaster (take staging database offline)
3. Follow DR runbook exactly
4. Time each step
5. Note any problems
6. Recover staging database
7. Team debrief
8. Update runbook with findings
```

**Time**: 2 hours
**Frequency**: Quarterly

### Annual Full DR Exercise

**Procedure**:
```
1. Full team participation
2. Simulate complete infrastructure loss
3. Recover all systems from backups
4. Test all runbooks
5. Verify all services
6. Document timeline
7. Identify improvements
8. Update all documentation
```

**Time**: Full day
**Frequency**: Annually

---

## Real-World Examples

### Example 1: GitLab Database Deletion (2017)

**What Happened**:
```
GitLab engineer accidentally deleted production database
Command: rm -rf /var/opt/gitlab/postgresql/data
Result: Production database destroyed
```

**Recovery Attempts**:
```
Backup 1 (LVM snapshots): Failed (not running)
Backup 2 (Azure disk snapshots): Failed (not working)
Backup 3 (S3 backup): Failed (not uploading)
Backup 4 (pg_dump): Failed (not running)
Backup 5 (Staging replication): SUCCESS! (6 hours of data lost)
```

**Result**:
- 18 hours to recover
- Lost 6 hours of data
- Used staging database replication (the only working backup)

**Lessons**:
1. Have multiple backup methods
2. Test backups regularly
3. Monitor backup success
4. Document recovery procedures

### Example 2: AWS S3 Outage (2017)

**What Happened**:
```
AWS engineer typo during maintenance
Removed more servers than intended
S3 in US-EAST-1 down for 4 hours
Affected: Thousands of websites
```

**Companies with Good DR**:
```
✅ Multi-region setup → Switched to other region
✅ CDN with failover → Served cached content
✅ Status page on different provider → Kept users informed

Result: Minimal customer impact
```

**Companies without DR**:
```
❌ Single region → Complete outage
❌ No backup → No access to data
❌ No status page → Customers confused

Result: 4 hours complete downtime
```

**Lessons**:
1. Don't rely on single region
2. Have failover capabilities
3. Keep critical services independent

### Example 3: Code Spaces Shutdown (2014)

**What Happened**:
```
Hackers gained access to Code Spaces AWS account
Deleted production servers, databases, and backups
Company had only AWS backups (same account as production)
```

**Result**:
- Complete data loss
- No recovery possible
- Company shut down

**Lessons**:
1. Store backups in different accounts
2. Use separate security credentials
3. Have offline backups
4. Never store all backups in same place as production

---

## Conclusion

### Key Takeaways

1. **DR Is Essential**: Not if disaster happens, but when
2. **Document Everything**: Clear runbooks save hours during crisis
3. **Test Regularly**: Untested DR plan might not work
4. **Automate Checks**: Know immediately when DR readiness degrades
5. **Multiple Backups**: One backup is not enough
6. **Off-Site Storage**: Don't lose backups with production
7. **Keep It Simple**: Complex plans fail under pressure
8. **Team Training**: Everyone should know DR procedures

### Remember

> "Hope is not a disaster recovery strategy"

Disasters are inevitable. The question is not whether you'll need your DR plan, but how well it will work when you do.

### Final Checklist

Before considering your DR plan complete:

- ✅ RTO defined for each component
- ✅ RPO defined for each data type
- ✅ Runbook for each disaster scenario
- ✅ Automated backups configured
- ✅ Backup restoration tested
- ✅ DR checks automated
- ✅ Team trained on procedures
- ✅ Emergency contacts documented
- ✅ Off-site backups configured
- ✅ Regular testing scheduled

**If you can check all boxes**: You're ready for disaster

**If you can't**: Keep working - your business depends on it

---

Happy disaster recovering! 🚨💾
