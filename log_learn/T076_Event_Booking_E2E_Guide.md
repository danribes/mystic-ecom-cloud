# Learning Guide: End-to-End Testing with Playwright

## 📚 Overview

This guide explains end-to-end (E2E) testing concepts and patterns used in the T076 event booking test. You'll learn about E2E testing fundamentals, Playwright framework, test organization, and best practices for testing complete user journeys.

## 🎯 What You'll Learn

1. What E2E testing is and why it matters
2. How Playwright works and its advantages
3. Test organization and structure patterns
4. Database integration in E2E tests
5. Graceful feature detection and test skipping
6. Multi-browser testing strategies
7. Best practices for reliable E2E tests

---

## Part 1: Understanding E2E Testing

### What is End-to-End Testing?

**E2E testing** validates that an entire application workflow functions correctly from start to finish, exactly as a real user would experience it.

### The Testing Pyramid

```
        /\
       /  \  E2E Tests (few, slow, high confidence)
      /____\
     /      \  Integration Tests (moderate)
    /________\
   /          \  Unit Tests (many, fast, low confidence)
  /__________  \
```

**Unit Tests:**
- Test individual functions in isolation
- Fast, many tests
- Example: Testing a `calculatePrice(attendees, pricePerPerson)` function

**Integration Tests:**
- Test how components work together
- Moderate speed, moderate coverage
- Example: Testing booking creation with database operations

**E2E Tests:**
- Test complete user flows in a real browser
- Slow, fewer tests, but highest confidence
- Example: User browses events → selects event → books → receives confirmation

### Why E2E Tests Matter

1. **Real User Simulation:** Tests what users actually experience
2. **Cross-System Validation:** Tests frontend, backend, database together
3. **Business Logic Verification:** Validates critical user journeys
4. **Regression Prevention:** Catches breaks in real workflows
5. **Confidence in Deployment:** Know that key features work before releasing

---

## Part 2: Playwright Fundamentals

### What is Playwright?

Playwright is a modern E2E testing framework by Microsoft that:
- Controls real browsers (Chromium, Firefox, WebKit)
- Simulates user interactions (click, type, navigate)
- Supports multiple browsers and devices
- Provides automatic waiting and retry logic
- Captures screenshots and videos

### Key Playwright Concepts

#### 1. Browser Context
Each test gets an isolated browser context (like incognito mode):

```typescript
test('example', async ({ page }) => {
  // 'page' is provided automatically
  // Fresh browser context for this test
  await page.goto('/events');
});
```

#### 2. Locators
Find elements on the page using various selectors:

```typescript
// By test ID (best practice)
const button = page.locator('[data-testid="book-button"]');

// By text content
const button = page.locator('button:has-text("Book Now")');

// By role (accessibility-friendly)
const button = page.getByRole('button', { name: 'Book Now' });

// By CSS selector
const button = page.locator('.event-card button');
```

#### 3. Actions
Simulate user interactions:

```typescript
// Click
await button.click();

// Type text
await input.fill('John Doe');

// Select from dropdown
await select.selectOption('New York');

// Check checkbox
await checkbox.check();

// Navigate
await page.goto('/events');
```

#### 4. Assertions
Verify expected outcomes:

```typescript
// Element visibility
await expect(element).toBeVisible();

// Text content
await expect(element).toContainText('Success');

// Page URL
await expect(page).toHaveURL('/confirmation');

// Element state
await expect(button).toBeDisabled();

// Count
await expect(page.locator('.event-card')).toHaveCount(5);
```

#### 5. Auto-Waiting
Playwright automatically waits for:
- Elements to be visible before clicking
- Elements to be enabled before interacting
- Network requests to complete
- Animations to finish

```typescript
// No manual waits needed!
await page.locator('button').click(); // Waits until clickable
await expect(page.locator('h1')).toContainText('Events'); // Waits until visible
```

---

## Part 3: Test Organization Patterns

### Test Structure

```typescript
test.describe('Feature Area', () => {
  // Runs once before all tests in this describe block
  test.beforeAll(async () => {
    // Setup: Create test data
  });

  // Runs after all tests in this describe block
  test.afterAll(async () => {
    // Teardown: Clean up test data
  });

  // Runs before each test
  test.beforeEach(async ({ page }) => {
    // Reset state, navigate to page
  });

  // Runs after each test
  test.afterEach(async () => {
    // Optional per-test cleanup
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });

  test.describe('Nested Feature', () => {
    // Can nest test groups
  });
});
```

### Test Naming Conventions

**Good Test Names:**
```typescript
✅ test('should display events catalog page')
✅ test('should prevent booking more attendees than available spots')
✅ test('should send email confirmation after successful booking')
```

**Poor Test Names:**
```typescript
❌ test('events page') // Not descriptive
❌ test('test booking') // Vague
❌ test('it works') // No clear expectation
```

### Organizing by User Journey

```typescript
test.describe('Event Booking Flow', () => {
  test.describe('Event Discovery', () => {
    // Tests for browsing and filtering
  });

  test.describe('Event Details', () => {
    // Tests for viewing event information
  });

  test.describe('Booking Process', () => {
    // Tests for creating bookings
  });

  test.describe('Confirmation', () => {
    // Tests for post-booking experience
  });
});
```

---

## Part 4: Database Integration in E2E Tests

### Why Include Database Operations?

E2E tests need to:
1. **Set up test data** before tests run
2. **Verify outcomes** in the database
3. **Clean up** after tests complete

### Setup and Teardown Pattern

```typescript
import { pool } from '../setup/database';

let testUser: User;
let testEvent: Event;

test.beforeAll(async () => {
  // Create test user
  const userResult = await pool.query(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *`,
    ['test@example.com', 'Test User', 'user']
  );
  testUser = userResult.rows[0]!;

  // Create test event
  const eventResult = await pool.query(
    `INSERT INTO events (title, slug, price, capacity, available_spots, is_published)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    ['Test Event', 'test-event', 99.99, 10, 10, true]
  );
  testEvent = eventResult.rows[0]!;
});

test.afterAll(async () => {
  // Clean up in reverse order (respect foreign keys)
  await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUser.id]);
  await pool.query('DELETE FROM events WHERE id = $1', [testEvent.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
});
```

### Verifying Database State

```typescript
test('should create booking successfully', async ({ page }) => {
  // UI interaction
  await page.goto(`/events/${testEvent.slug}`);
  await page.locator('[data-testid="book-button"]').click();
  await page.locator('input[name="attendees"]').fill('2');
  await page.locator('button[type="submit"]').click();

  // Verify UI feedback
  await expect(page.getByText(/booking confirmed/i)).toBeVisible();

  // Verify database state
  const bookingResult = await pool.query(
    'SELECT * FROM bookings WHERE user_id = $1 AND event_id = $2',
    [testUser.id, testEvent.id]
  );

  // Assertions on database data
  expect(bookingResult.rows.length).toBe(1);
  expect(bookingResult.rows[0].attendees).toBe(2);
  expect(parseFloat(bookingResult.rows[0].total_price)).toBe(199.98);

  // Verify side effects (available spots updated)
  const eventResult = await pool.query(
    'SELECT available_spots FROM events WHERE id = $1',
    [testEvent.id]
  );
  expect(eventResult.rows[0].available_spots).toBe(8); // 10 - 2
});
```

---

## Part 5: Graceful Feature Detection

### The Problem

When writing tests before implementation:
- Features don't exist yet
- Tests would fail with false negatives
- Can't run test suite until everything is built

### The Solution: Feature Detection

```typescript
test('should filter events by city', async ({ page }) => {
  await page.goto('/events');

  // Look for filter element
  const cityFilter = page.locator('select[name="city"]');

  if (await cityFilter.isVisible()) {
    // Feature exists - test it
    await cityFilter.selectOption('New York');
    await expect(page.locator('.event-card')).toHaveCount(2);
  } else {
    // Feature not implemented yet - skip test
    console.log('⚠️  City filter not found - feature may not be implemented yet');
    test.skip();
  }
});
```

### Benefits

1. **Tests Don't Break:** Unimplemented features don't cause failures
2. **Gradual Implementation:** Build features incrementally
3. **Self-Documenting:** Tests show what needs to be built
4. **CI/CD Friendly:** Test suite can run at any stage

### When to Use

✅ **Use feature detection when:**
- Writing tests before implementation (TDD)
- Features are being built incrementally
- Optional features might not be present

❌ **Don't use feature detection when:**
- Testing core, required functionality
- Feature should always be present
- In production test suites

---

## Part 6: Multi-Browser Testing

### Browser Matrix

Playwright supports testing across multiple browsers and devices:

```typescript
// playwright.config.ts
export default {
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
};
```

### Why Test Multiple Browsers?

1. **Different Engines:** Chromium (Chrome/Edge), Gecko (Firefox), WebKit (Safari)
2. **CSS Differences:** Rendering varies between browsers
3. **JavaScript APIs:** Some features work differently
4. **Mobile Constraints:** Touch interactions, viewport sizes
5. **Real-World Coverage:** Users use different browsers

### Example Browser-Specific Issues

**CSS Grid:**
```css
/* Works in Chrome, issues in older Safari */
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
```

**Date Inputs:**
```html
<!-- Native picker in Chrome, text input in Firefox -->
<input type="date" />
```

**Flexbox:**
```css
/* Flex gap support varies */
.flex-container {
  gap: 1rem; /* Not in older Safari */
}
```

---

## Part 7: Best Practices for Reliable E2E Tests

### 1. Use Data Test IDs

**❌ Fragile (CSS classes change):**
```typescript
await page.locator('.btn.btn-primary.event-booking').click();
```

**✅ Stable (dedicated test IDs):**
```typescript
await page.locator('[data-testid="book-event-button"]').click();
```

```html
<button data-testid="book-event-button">Book Now</button>
```

### 2. Avoid Hard-Coded Waits

**❌ Brittle:**
```typescript
await page.click('button');
await page.waitForTimeout(3000); // Hope 3 seconds is enough
```

**✅ Robust:**
```typescript
await page.click('button');
await expect(page.locator('.success-message')).toBeVisible();
// Automatically waits with retries
```

### 3. Test User Journeys, Not Implementation

**❌ Implementation-focused:**
```typescript
test('should call createBooking API', async ({ page }) => {
  // Testing internal API calls
});
```

**✅ User-focused:**
```typescript
test('should allow user to book an event', async ({ page }) => {
  await page.goto('/events/meditation-retreat');
  await page.click('[data-testid="book-button"]');
  await page.fill('[name="attendees"]', '2');
  await page.click('button[type="submit"]');
  await expect(page.getByText(/booking confirmed/i)).toBeVisible();
});
```

### 4. Keep Tests Independent

**❌ Tests depend on each other:**
```typescript
test('create user', async () => {
  // Creates user
});

test('login user', async () => {
  // Assumes previous test ran
});
```

**✅ Tests are self-contained:**
```typescript
test('login user', async () => {
  // Create user in this test
  await createTestUser();
  // Login
  await loginAs(testUser);
});
```

### 5. Clean Up Test Data

```typescript
test.afterAll(async () => {
  // Always clean up, even if tests fail
  await pool.query('DELETE FROM bookings WHERE email LIKE $1', ['%test%']);
  await pool.query('DELETE FROM events WHERE slug LIKE $1', ['%test%']);
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%test%']);
});
```

### 6. Use Page Object Pattern (Optional)

For complex pages, encapsulate selectors and actions:

```typescript
class EventPage {
  constructor(private page: Page) {}

  async goto(slug: string) {
    await this.page.goto(`/events/${slug}`);
  }

  async clickBookButton() {
    await this.page.locator('[data-testid="book-button"]').click();
  }

  async fillAttendees(count: number) {
    await this.page.locator('input[name="attendees"]').fill(String(count));
  }

  async submitBooking() {
    await this.page.locator('button[type="submit"]').click();
  }
}

// In test
test('book event', async ({ page }) => {
  const eventPage = new EventPage(page);
  await eventPage.goto('meditation-retreat');
  await eventPage.clickBookButton();
  await eventPage.fillAttendees(2);
  await eventPage.submitBooking();
});
```

---

## Part 8: Debugging E2E Tests

### 1. Headed Mode (See Browser)

```bash
# Run tests with visible browser
npx playwright test --headed
```

### 2. Debug Mode (Step Through)

```bash
# Pause before each action
npx playwright test --debug
```

### 3. Screenshots

Playwright automatically captures screenshots on failure:

```typescript
// test-results/
//   test-name-chromium/
//     test-failed-1.png
```

### 4. Trace Viewer

```bash
# Record trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

Trace shows:
- Each action taken
- Screenshots at each step
- Network requests
- Console logs

### 5. Slow Motion

```typescript
// playwright.config.ts
use: {
  launchOptions: {
    slowMo: 500, // 500ms delay between actions
  },
},
```

---

## Part 9: Common E2E Testing Patterns

### Pattern 1: Testing Forms

```typescript
test('should submit booking form', async ({ page }) => {
  await page.goto('/events/meditation-retreat');

  // Fill form
  await page.fill('[name="name"]', 'John Doe');
  await page.fill('[name="email"]', 'john@example.com');
  await page.fill('[name="attendees"]', '2');

  // Submit
  await page.click('button[type="submit"]');

  // Verify success
  await expect(page.getByText(/thank you/i)).toBeVisible();
  await expect(page).toHaveURL('/confirmation');
});
```

### Pattern 2: Testing Navigation

```typescript
test('should navigate through event flow', async ({ page }) => {
  // Start at home
  await page.goto('/');

  // Navigate to events
  await page.click('a:has-text("Events")');
  await expect(page).toHaveURL('/events');

  // Navigate to specific event
  await page.click('.event-card:first-child a');
  await expect(page).toHaveURL(/\/events\/[a-z0-9-]+/);

  // Use back button
  await page.goBack();
  await expect(page).toHaveURL('/events');
});
```

### Pattern 3: Testing Authentication

```typescript
test('should require login to book', async ({ page }) => {
  await page.goto('/events/meditation-retreat');

  // Click book (not logged in)
  await page.click('[data-testid="book-button"]');

  // Should redirect to login
  await expect(page).toHaveURL(/\/login/);

  // Login
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Should redirect back to event
  await expect(page).toHaveURL(/\/events\/meditation-retreat/);
});
```

### Pattern 4: Testing Filters

```typescript
test('should filter events by city', async ({ page }) => {
  await page.goto('/events');

  // Get initial count
  const initialCount = await page.locator('.event-card').count();

  // Apply filter
  await page.selectOption('select[name="city"]', 'New York');

  // Wait for results
  await page.waitForLoadState('networkidle');

  // Verify filtered results
  const filteredCount = await page.locator('.event-card').count();
  expect(filteredCount).toBeLessThan(initialCount);

  // Verify all results match filter
  const cities = await page.locator('.event-card .city').allTextContents();
  expect(cities.every(city => city.includes('New York'))).toBeTruthy();
});
```

### Pattern 5: Testing Error States

```typescript
test('should show error for sold out event', async ({ page }) => {
  // Set event to sold out in database
  await pool.query('UPDATE events SET available_spots = 0 WHERE slug = $1', ['meditation-retreat']);

  await page.goto('/events/meditation-retreat');

  // Should show sold out message
  await expect(page.getByText(/sold out/i)).toBeVisible();

  // Book button should be disabled
  await expect(page.locator('[data-testid="book-button"]')).toBeDisabled();

  // Restore for other tests
  await pool.query('UPDATE events SET available_spots = 20 WHERE slug = $1', ['meditation-retreat']);
});
```

---

## 🎓 Key Takeaways

1. **E2E tests validate complete user journeys**, not isolated functions
2. **Playwright provides automatic waiting** - no manual sleeps needed
3. **Use data-testid attributes** for stable, maintainable selectors
4. **Feature detection allows incremental implementation** without test failures
5. **Multi-browser testing catches cross-browser issues** before users do
6. **Database integration verifies side effects** beyond UI changes
7. **Proper setup/teardown ensures test isolation** and repeatability
8. **Test user behavior, not implementation details** for maintainable tests

---

## 📖 Further Reading

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Page Object Pattern](https://playwright.dev/docs/pom)
- [Visual Testing with Playwright](https://playwright.dev/docs/test-snapshots)

---

## 🧪 Practice Exercises

1. **Add payment flow test**: Test Stripe payment integration for bookings
2. **Test booking cancellation**: Verify spots are restored when bookings are cancelled
3. **Test concurrent bookings**: Simulate two users booking the last spot simultaneously
4. **Add accessibility tests**: Verify keyboard navigation and screen reader support
5. **Test mobile gestures**: Add swipe tests for mobile carousel

---

**Related Files:**
- Test: `tests/e2e/T076_event_booking.spec.ts`
- Log: `logs/T076_Event_Booking_E2E_Log.md`
- Schema: `database/schema.sql`
