# Phase 1: Initial Project Setup (T001-T003)

## Overview

These tasks establish the foundation of the entire project. Think of this as laying the groundwork for a house - everything else depends on getting this right.

---

## T001: Initialize Astro Project with TypeScript

### What We Did

```bash
npm create astro@latest . -- --template minimal --typescript strict --install --git --yes
```

### Why Astro?

**1. SSR (Server-Side Rendering) + Static Site Generation**
- Astro can render pages on the server (for dynamic content) or at build time (for static content)
- Perfect for e-commerce: product pages can be static, cart/checkout needs to be dynamic

**2. Zero JavaScript by Default**
- Astro only ships JavaScript for interactive components
- Result: Faster page loads, better SEO, lower bandwidth costs
- Example: A course listing page doesn't need JS unless you click "Add to Cart"

**3. Islands Architecture**
- Each interactive component is an "island" of JavaScript
- The rest of the page is static HTML
- Example: Header with cart count (interactive) + course descriptions (static)

**4. API Routes Built-In**
- Can create RESTful endpoints in `src/pages/api/`
- No need for separate backend server
- Example: `src/pages/api/cart/add.ts` handles POST requests

### Why TypeScript Strict Mode?

**Type Safety = Fewer Runtime Errors**

```typescript
// Without TypeScript (JavaScript)
function addToCart(courseId, quantity) {
  // What if courseId is undefined?
  // What if quantity is a string "5" instead of number 5?
  return db.insert({ courseId, quantity });
}

// With TypeScript Strict
function addToCart(courseId: string, quantity: number): Promise<CartItem> {
  // TypeScript ensures courseId is always a string
  // TypeScript ensures quantity is always a number
  // TypeScript ensures we return a Promise<CartItem>
  return db.insert({ courseId, quantity });
}
```

**Strict Mode Benefits:**
- No implicit `any` types (must be explicit)
- Null checks enforced (prevents "Cannot read property of undefined")
- Better IDE autocomplete and refactoring

### Files Created

```
/home/dan/web/
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── astro.config.mjs      # Astro framework settings
└── src/
    └── pages/
        └── index.astro   # Homepage (starter template)
```

### Key Configuration: tsconfig.json

```json
{
  "extends": "astro/tsconfigs/strict"  // Inherits Astro's strictest settings
}
```

This enables:
- `noImplicitAny`: Must declare types explicitly
- `strictNullChecks`: Can't use null/undefined without checking
- `strictFunctionTypes`: Function parameters must match exactly
- `noImplicitThis`: `this` keyword must have a clear type

---

## T002: Create Project Structure

### What We Did

```bash
mkdir -p tests/{unit,integration,e2e} \
         database/{migrations,seeds} \
         docker \
         src/{api,components,layouts,lib,middleware,styles}
```

### Why This Structure?

**1. Separation of Concerns**

Each directory has a single, clear purpose:

```
src/
├── api/          # Backend logic (API endpoints)
├── components/   # Reusable UI components
├── layouts/      # Page templates (header, footer, etc.)
├── lib/          # Business logic & utilities
├── middleware/   # Request interceptors (auth checks)
├── pages/        # Routes (maps to URLs)
└── styles/       # Global CSS
```

**Example: Adding a course to cart**
1. User clicks button → `components/CourseCard.astro` (UI)
2. Sends request → `pages/api/cart/add.ts` (API endpoint)
3. Validates data → `middleware/auth.ts` (check if logged in)
4. Business logic → `lib/cart.ts` (calculate totals)
5. Database → `lib/db.ts` (save to PostgreSQL)

**2. Testing Strategy**

```
tests/
├── unit/         # Test individual functions (fast, isolated)
├── integration/  # Test multiple components together
└── e2e/          # Test entire user flows (slow, realistic)
```

**Example Testing Pyramid:**
- **Unit**: Does `calculateCartTotal()` return correct sum?
- **Integration**: Does adding to cart update database correctly?
- **E2E**: Can user browse → add to cart → checkout → receive email?

**3. Database Organization**

```
database/
├── migrations/   # Schema changes (version controlled)
└── seeds/        # Test data for development
```

**Why migrations?**
- Track database changes over time
- Apply changes consistently across dev/staging/production
- Roll back changes if needed

Example migration:
```sql
-- 001_create_courses_table.sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL
);
```

**4. Docker Configuration**

```
docker/
└── (PostgreSQL & Redis config files)
```

Keeps all services isolated and reproducible. Any developer can run:
```bash
docker-compose up
```
And get the exact same database and cache setup.

---

## T003: Setup Dependencies

### What We Did

```bash
npm install astro @astrojs/node pg redis stripe bcrypt cookie zod twilio @sendgrid/mail
npm install -D typescript vitest @playwright/test eslint prettier
```

### Why Each Dependency?

#### Production Dependencies

**1. Astro Framework**
```json
"astro": "^5.15.3"
"@astrojs/node": "^9.0.2"  // SSR adapter
```
- Core framework for building the site
- Node adapter enables API routes and server-side rendering

**2. Database & Caching**
```json
"pg": "^8.13.1"      // PostgreSQL client
"redis": "^4.7.0"    // In-memory cache
```

**Why PostgreSQL?**
- ACID compliance (data integrity for orders/payments)
- Relationships (users → orders → order_items → courses)
- Full-text search for course catalog
- JSON support for flexible data (course metadata)

**Why Redis?**
- Session storage (user login state)
- Cart data (temporary, fast access)
- Rate limiting (prevent API abuse)
- Caching (reduce database load)

**Example: Session Flow**
```typescript
// User logs in
await redis.set(`session:${sessionId}`, JSON.stringify(userData), 'EX', 3600);

// User makes request
const session = await redis.get(`session:${sessionId}`);
if (!session) return 401; // Not logged in
```

**3. Payment Processing**
```json
"stripe": "^17.5.0"
```
- Industry-standard payment gateway
- PCI compliance handled by Stripe (we never store card numbers)
- Webhook support (get notified when payment succeeds)
- Test mode for development

**4. Security**
```json
"bcrypt": "^5.1.1"    // Password hashing
"cookie": "^1.0.2"    // Cookie parsing
```

**Why bcrypt?**
```typescript
// NEVER store plain text passwords!
const plainPassword = "user123";

// Bad: Anyone with database access can see passwords
await db.insert({ password: plainPassword }); // ❌

// Good: Hash password (one-way encryption)
const hashedPassword = await bcrypt.hash(plainPassword, 10);
await db.insert({ password: hashedPassword }); // ✅

// Verify on login
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**5. Validation & Communication**
```json
"zod": "^3.23.8"              // Schema validation
"twilio": "^5.3.6"            // WhatsApp notifications
"@sendgrid/mail": "^8.1.4"    // Email delivery
```

**Why Zod?**
```typescript
// Without validation
function addToCart(data: any) {
  // What if data.quantity is negative?
  // What if data.courseId is missing?
  db.insert(data); // 💥 Could crash or corrupt data
}

// With Zod validation
const AddToCartSchema = z.object({
  courseId: z.string().uuid(),
  quantity: z.number().min(1).max(10)
});

function addToCart(data: unknown) {
  const validated = AddToCartSchema.parse(data); // Throws if invalid
  db.insert(validated); // ✅ Safe
}
```

#### Development Dependencies

**1. TypeScript**
```json
"typescript": "^5.7.2"
```
Compiles `.ts` files to JavaScript and checks types during development.

**2. Testing Frameworks**
```json
"vitest": "^2.1.8"              // Unit testing
"@playwright/test": "^1.49.1"   // E2E testing
```

**Why Vitest?**
- Fast (uses Vite for transpilation)
- Compatible with Vite/Astro ecosystem
- Jest-compatible API (familiar to most developers)

**Why Playwright?**
- Tests real browser behavior (Chrome, Firefox, Safari)
- Can test authentication flows, payments, etc.
- Generates screenshots/videos on failure

**3. Code Quality**
```json
"eslint": "^9.16.0"        // Find code issues
"prettier": "^3.4.2"       // Format code consistently
```

**Why both?**
- **ESLint**: Logic errors (unused variables, missing await, etc.)
- **Prettier**: Style (spacing, quotes, line length)

Example:
```typescript
// ESLint catches logic errors
const result = await fetchData()  // ❌ Missing semicolon
console.log(result.user.name)     // ❌ Could be undefined

// Prettier fixes formatting
const result = await fetchData();
console.log(result?.user?.name);  // ✅ Formatted + safe
```

---

## Key Takeaways

1. **Astro** provides SSR + static generation for optimal performance
2. **TypeScript Strict** prevents runtime errors through compile-time checks
3. **Project Structure** separates concerns (API, UI, business logic, tests)
4. **Dependencies** are chosen for specific reasons (security, performance, developer experience)
5. **Testing Strategy** ensures code quality at multiple levels

---

## What's Next?

With the foundation in place, we can now:
- Configure TypeScript, ESLint, Prettier (T004-T005)
- Set up environment variables (T006-T007)
- Configure Docker for PostgreSQL and Redis (T008)
- Design database schema (T009)
- Configure testing frameworks (T010-T011)
- Configure Astro for SSR and API routes (T012)

---

**Related Files:**
- [package.json](/home/dan/web/package.json)
- [tsconfig.json](/home/dan/web/tsconfig.json)
- [astro.config.mjs](/home/dan/web/astro.config.mjs)

**Next Guide:** [Phase 1 Configuration (T004-T012)](./phase1-configuration.md)
