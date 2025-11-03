# Phase 1: Configuration & Tooling (T004-T012)

## Overview

After initializing the project structure (T001-T003), this phase establishes the development environment configuration: TypeScript settings, code quality tools (ESLint, Prettier), testing frameworks (Vitest, Playwright), Docker services, and Astro SSR configuration.

---

## T004: TypeScript Configuration

### File: `tsconfig.json`

### Base Configuration

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

### Why Extend Astro's Strict Config?

**Astro's strict config provides:**
- `strict: true` - Enables all strict type-checking options
- `noImplicitAny: true` - Error on implicit any types
- `strictNullChecks: true` - Prevents null/undefined issues
- `noUnusedLocals: true` - Catches unused variables
- `noUnusedParameters: true` - Catches unused function parameters

**Example benefits:**

```typescript
// ❌ Without strict mode
function getUser(id) {  // No error - 'id' implicitly 'any'
  return users[id];     // No error - might be undefined
}

// ✅ With strict mode
function getUser(id: string): User | undefined {  // Must specify types
  return users[id];     // Type-safe
}
```

### TypeScript Strict Mode Features

**1. Null Safety**
```typescript
// ❌ Without strictNullChecks
const user = users.find(u => u.id === id);
console.log(user.name);  // Runtime error if undefined

// ✅ With strictNullChecks
const user = users.find(u => u.id === id);
if (user) {
  console.log(user.name);  // Type-safe
}
```

**2. Function Type Safety**
```typescript
// ❌ Without strict mode
function process(callback) {  // Implicit any
  callback();  // No checks
}

// ✅ With strict mode
function process(callback: () => void) {  // Explicit type
  callback();  // Type-checked
}
```

---

## T005: ESLint & Prettier Setup

### File: `.eslintrc.json`

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "overrides": [
    {
      "files": ["*.astro"],
      "parser": "astro-eslint-parser",
      "parserOptions": {
        "parser": "@typescript-eslint/parser",
        "extraFileExtensions": [".astro"]
      }
    }
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### File: `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro"],
  "overrides": [
    {
      "files": "*.astro",
      "options": {
        "parser": "astro"
      }
    }
  ]
}
```

### Why Both ESLint and Prettier?

**ESLint (Code Quality):**
- Finds bugs and anti-patterns
- Enforces best practices
- TypeScript-specific rules
- Example: Unused variables, missing returns

**Prettier (Code Formatting):**
- Consistent formatting
- Automatic code styling
- No debates about tabs vs spaces
- Example: Line length, semicolons, quotes

**They complement each other:**
```typescript
// ESLint catches this logic error
if (user.role = 'admin') {  // ❌ Assignment instead of comparison
  // ...
}

// Prettier fixes this formatting
const user={name:"John",age:30};  // Ugly
const user = { name: 'John', age: 30 };  // ✅ Pretty
```

### VS Code Integration

**File: `.vscode/settings.json`**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[astro]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "astro"
  ]
}
```

---

## T006: Environment Variables Template

### File: `.env.example`

```bash
# Application
NODE_ENV=development
PUBLIC_SITE_URL=http://localhost:4321

# Database
DATABASE_URL=postgresql://postgres:postgres_dev_password@localhost:5432/spirituality_platform

# Redis
REDIS_URL=redis://localhost:6379

# Session
SESSION_COOKIE_NAME=sid
SESSION_TTL=86400
BCRYPT_ROUNDS=10

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@spiritualityplatform.com
SENDGRID_FROM_NAME=Spirituality Platform

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### Why `.env.example`?

**Security:**
- Never commit `.env` to Git
- `.env.example` documents required variables
- Developers copy to `.env` and fill in secrets

**Onboarding:**
```bash
# New developer setup
git clone project
cp .env.example .env
# Edit .env with actual credentials
npm install
npm run dev
```

### Environment Variable Best Practices

**1. Prefix Public Variables**
```typescript
// ❌ Security risk - all env vars exposed to client
const apiKey = import.meta.env.STRIPE_SECRET_KEY;

// ✅ Only PUBLIC_ vars exposed to client
const siteUrl = import.meta.env.PUBLIC_SITE_URL;  // Safe
```

**2. Type-Safe Env Variables**
```typescript
// src/env.d.ts
interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly REDIS_URL: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**3. Validation on Startup**
```typescript
// src/lib/env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'STRIPE_SECRET_KEY',
] as const;

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});
```

---

## T007: Git Ignore Configuration

### File: `.gitignore`

```gitignore
# Dependencies
node_modules/
package-lock.json

# Build outputs
dist/
.astro/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
logs/

# Testing
coverage/
.nyc_output/
playwright-report/
test-results/

# Uploads
uploads/
public/uploads/

# Temporary files
*.tmp
.cache/

# Database
*.db
*.sqlite
```

### Why Ignore These?

**Dependencies (`node_modules/`):**
- 300MB+ of files
- Reproducible via `npm install`
- Different per OS (native modules)

**Build Outputs (`dist/`, `.astro/`):**
- Generated files
- Can be rebuilt anytime
- Changes every build

**Secrets (`.env`):**
- Contains API keys
- Database passwords
- Never commit secrets!

**IDE Files (`.vscode/`, `.idea/`):**
- Personal preferences
- Different per developer
- Can cause merge conflicts

---

## T008: Docker Compose Setup

### File: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: spirituality_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: spirituality_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_dev_password
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./database/seeds/dev.sql:/docker-entrypoint-initdb.d/02-seeds.sql:ro
    networks:
      - spirituality_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: spirituality_redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - spirituality_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  spirituality_network:
    driver: bridge
```

### Why Docker?

**Consistency:**
```bash
# Without Docker
Developer A: PostgreSQL 14, Redis 6 (Mac)
Developer B: PostgreSQL 15, Redis 7 (Ubuntu)
Production: PostgreSQL 15, Redis 7 (AWS)
# Different versions = different bugs

# With Docker
All environments: PostgreSQL 15, Redis 7
# Same versions everywhere
```

**Easy Setup:**
```bash
# Traditional setup (30+ minutes)
brew install postgresql redis
pg_ctl start
redis-server
createdb spirituality_platform
psql spirituality_platform < schema.sql

# Docker setup (2 minutes)
docker-compose up -d
# Done!
```

### Docker Compose Features Explained

**1. Auto-Initialization**
```yaml
volumes:
  - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
  - ./database/seeds/dev.sql:/docker-entrypoint-initdb.d/02-seeds.sql:ro
```
- Files in `/docker-entrypoint-initdb.d/` run on first start
- Numbered prefix (`01-`, `02-`) controls order
- `:ro` means read-only (container can't modify host files)

**2. Health Checks**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```
- Ensures database is ready before app starts
- `docker-compose ps` shows health status
- Prevents "connection refused" errors

**3. Persistent Data**
```yaml
volumes:
  postgres_data:  # Named volume
    driver: local
```
- Data survives container restarts
- `docker-compose down` keeps data
- `docker-compose down -v` deletes data

### Docker Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services (keeps data)
docker-compose down

# Stop and remove data
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Execute SQL
docker-compose exec postgres psql -U postgres -d spirituality_platform

# Check health
docker-compose ps
```

---

## T009: Database Schema

Covered in detail in [phase2-database-redis.md](./phase2-database-redis.md#t013-database-schema-design).

---

## T010: Vitest Configuration

### File: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',  // Playwright tests
      '**/*.spec.ts',     // Playwright convention
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    setupFiles: ['./tests/T010-vitest-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@api': path.resolve(__dirname, './src/api'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
});
```

### Why Vitest?

**Fast:**
- Uses Vite's transform pipeline
- Instant watch mode
- Parallel test execution

**Modern:**
- Native ESM support
- TypeScript out of the box
- Same config as Vite/Astro

**Compatible:**
- Jest-like API (easy migration)
- Chai assertions built-in
- Supports mocking

### Key Configuration Options

**1. Path Aliases**
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@lib': path.resolve(__dirname, './src/lib'),
  }
}

// Now you can write:
import { db } from '@/lib/db';
// Instead of:
import { db } from '../../../lib/db';
```

**2. Coverage Thresholds**
```typescript
coverage: {
  thresholds: {
    lines: 70,      // 70% of lines must be tested
    functions: 70,  // 70% of functions must be tested
    branches: 70,   // 70% of branches must be tested
    statements: 70, // 70% of statements must be tested
  }
}
```
- Build fails if coverage drops below thresholds
- Prevents untested code from being merged

**3. Global Test APIs**
```typescript
test: {
  globals: true,  // Enables global describe, it, expect
}

// Now you can write:
describe('User', () => {
  it('should create user', () => {
    expect(user).toBeDefined();
  });
});

// Instead of:
import { describe, it, expect } from 'vitest';
```

### Setup File

**File: `tests/T010-vitest-setup.ts`**
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

// Setup before all tests
beforeAll(async () => {
  // Connect to test database
  await db.connect();
});

// Cleanup after all tests
afterAll(async () => {
  await db.end();
  await redis.quit();
});

// Reset database before each test
beforeEach(async () => {
  // Truncate all tables
  await db.query('TRUNCATE TABLE users, courses, orders CASCADE');
});
```

---

## T011: Playwright Configuration

### File: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Why Playwright?

**Cross-Browser:**
- Tests on Chrome, Firefox, Safari
- Same test code for all browsers
- Catches browser-specific bugs

**Real User Simulation:**
```typescript
// Playwright simulates real user actions
await page.goto('/login');
await page.fill('input[name="email"]', 'user@example.com');
await page.fill('input[name="password"]', 'password123');
await page.click('button[type="submit"]');
await expect(page).toHaveURL('/dashboard');
```

**Built-in Waiting:**
- Auto-waits for elements
- No `sleep()` calls needed
- Handles async operations

### Key Configuration Options

**1. Multiple Browsers**
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```
- One test runs on all browsers
- Catches browser compatibility issues

**2. Automatic Server Management**
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:4321',
  reuseExistingServer: !process.env.CI,
}
```
- Starts dev server before tests
- Waits for server to be ready
- Kills server after tests
- Reuses existing server locally (faster)

**3. Test Artifacts**
```typescript
use: {
  trace: 'on-first-retry',      // Record trace on failure
  screenshot: 'only-on-failure', // Screenshot on failure
}
```
- Helps debug failures
- `npx playwright show-report` to view

---

## T012: Astro SSR Configuration

### File: `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'http://localhost:4321',
  output: 'server',  // Enable SSR
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    tailwind({
      applyBaseStyles: false,  // Use custom global.css
    }),
  ],
  server: {
    port: 4321,
    host: true,  // Listen on all network interfaces
  },
});
```

### Why SSR (Server-Side Rendering)?

**Static Site (Default Astro):**
```
Build time: HTML generated once
Request: Serve pre-built HTML
Problem: Can't access database, can't check auth
```

**SSR (Server-Side Rendering):**
```
Request time: HTML generated per request
Request: Run server code, access DB, check auth, return HTML
Solution: Dynamic content, authentication, API routes
```

**Example:**
```astro
---
// ❌ Static: Can't access database
const courses = [
  { id: 1, title: 'Hardcoded Course' }
];

// ✅ SSR: Query database on each request
export const prerender = false;
import { db } from '@/lib/db';
const result = await db.query('SELECT * FROM courses');
const courses = result.rows;
---

<h1>Courses</h1>
{courses.map(course => (
  <div>{course.title}</div>
))}
```

### Node Adapter Options

**Standalone Mode:**
```javascript
adapter: node({
  mode: 'standalone',
})
```
- Runs as independent Node.js server
- Includes all dependencies
- Easy deployment (just copy `dist/` folder)

**Alternative: Middleware Mode**
```javascript
adapter: node({
  mode: 'middleware',
})
```
- Runs as Express/Connect middleware
- Integrate with existing Node server
- More control over server setup

### Enabling SSR Per Page

```astro
---
// Page-level SSR control
export const prerender = false;  // SSR this page
// or
export const prerender = true;   // Static this page
---
```

**Strategy:**
- Static pages: Home, About, Blog posts (fast, cached)
- SSR pages: Dashboard, Profile, Cart (dynamic, auth required)

---

## Testing the Configuration

### 1. TypeScript Compilation
```bash
npx tsc --noEmit
# Should output nothing (no errors)
```

### 2. Lint Check
```bash
npx eslint . --ext .ts,.astro
# Should show no errors
```

### 3. Format Check
```bash
npx prettier --check "src/**/*.{ts,astro}"
# Should show formatted files
```

### 4. Start Docker Services
```bash
docker-compose up -d
docker-compose ps
# Both services should show "healthy"
```

### 5. Run Unit Tests
```bash
npm test
# Should run Vitest
```

### 6. Run E2E Tests
```bash
npm run test:e2e
# Should run Playwright (after implementing tests)
```

### 7. Start Dev Server
```bash
npm run dev
# Should start on http://localhost:4321
```

---

## Key Takeaways

1. **Strict TypeScript** - Catches bugs at compile time, not runtime
2. **Code Quality Tools** - ESLint finds bugs, Prettier formats code
3. **Environment Variables** - Never commit secrets, use `.env.example` for documentation
4. **Docker** - Consistent database/Redis versions across all environments
5. **Testing Frameworks** - Vitest for unit tests, Playwright for E2E tests
6. **SSR Configuration** - Enables dynamic content, authentication, API routes

---

**Related Files:**
- [tsconfig.json](/home/dan/web/tsconfig.json)
- [vitest.config.ts](/home/dan/web/vitest.config.ts)
- [playwright.config.ts](/home/dan/web/playwright.config.ts)
- [astro.config.mjs](/home/dan/web/astro.config.mjs)
- [docker-compose.yml](/home/dan/web/docker-compose.yml)

**Next Guide:** [Phase 2: Database & Caching (T013-T017)](./phase2-database-redis.md)
