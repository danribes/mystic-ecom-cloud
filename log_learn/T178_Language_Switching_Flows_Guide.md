# T178: Test Language Switching Across All User Flows - Learning Guide

**Task ID:** T178
**Purpose:** Educational guide on integration testing for i18n systems
**Audience:** Developers learning about testing multilingual applications
**Date:** 2025-11-02

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is Integration Testing?](#what-is-integration-testing)
3. [Why Test Language Switching?](#why-test-language-switching)
4. [Test Architecture](#test-architecture)
5. [Key Concepts](#key-concepts)
6. [Testing Strategies](#testing-strategies)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Real-World Scenarios](#real-world-scenarios)

---

## Introduction

### What We Built

T178 is a comprehensive integration test suite that verifies language switching works correctly across all user flows. This is **NOT a feature implementation** - it's a validation layer that ensures all i18n components work together.

### Learning Objectives

After reading this guide, you will understand:
- The difference between unit tests and integration tests
- How to test multilingual applications end-to-end
- Database integration testing strategies
- Testing user flows across multiple components
- Edge case identification and validation
- Performance testing basics

---

## What is Integration Testing?

### Definition

**Integration Testing** verifies that multiple components work together correctly. Unlike unit tests (which test individual functions in isolation), integration tests validate the connections between components.

### Unit Test vs Integration Test

**Unit Test Example:**
```typescript
// Tests ONE function in isolation
it('should translate a key', () => {
  const result = t('en', 'common.yes');
  expect(result).toBe('Yes');
});
```

**Integration Test Example:**
```typescript
// Tests MULTIPLE components working together
it('should support complete EN → ES → EN journey', async () => {
  // 1. Update user preference (database)
  await updateUserLanguagePreference(userId, 'es');

  // 2. Get preference (database + validation)
  const locale = await getUserLanguagePreference(userId);

  // 3. Fetch content (database + translation)
  const course = await getLocalizedCourseById(courseId, locale);

  // 4. Generate email (templating + translation)
  const email = generateOrderConfirmationEmail(data, locale);

  // Verify everything uses Spanish
  expect(locale).toBe('es');
  expect(course?.locale).toBe('es');
  expect(email.subject).toMatch(/pedido|confirmación/);
});
```

### Why Both Are Needed

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **Scope** | Single function | Multiple components |
| **Speed** | Fast (milliseconds) | Slower (seconds) |
| **Isolation** | Fully isolated | Real dependencies |
| **Mocking** | Heavily mocked | Minimal mocking |
| **Coverage** | Function logic | Component interaction |
| **Failures** | Pinpoint exact bug | Show integration issues |

**Analogy:**
- **Unit tests** = Testing each instrument in an orchestra individually
- **Integration tests** = Testing if the orchestra plays in harmony

---

## Why Test Language Switching?

### The Problem

Multilingual applications have many failure points:

1. **Database Issues**
   - User preference not saved
   - Query returns wrong language
   - Null values not handled

2. **Translation Issues**
   - Missing translation keys
   - Wrong locale passed
   - Fallback not working

3. **Component Issues**
   - UI uses one language
   - Email uses another language
   - Content in wrong language

4. **Flow Issues**
   - Language changes don't propagate
   - Preference not respected
   - Inconsistent across pages

### Real-World Scenario

**Without Integration Tests:**
```
User sets preference to Spanish ✅
Preference saves to database ✅
Course page shows Spanish ✅
Email sent in English ❌ ← BUG!
```

The bug only appears when components interact. Unit tests would pass, but user experience is broken.

**With Integration Tests:**
```typescript
it('should send email in user preferred language', async () => {
  await updateUserLanguagePreference(userId, 'es');
  const locale = await getUserLanguagePreference(userId);
  const email = generateOrderConfirmationEmail(data, locale);

  expect(email.subject).toMatch(/pedido/); // Would FAIL - catches bug!
});
```

---

## Test Architecture

### Test File Structure

```typescript
// tests/integration/T178_language_switching_flows.test.ts

describe('T178: Language Switching Across All User Flows', () => {
  // 1. Setup Phase
  let testUserId: string;
  let testCourseId: string;

  beforeAll(async () => {
    // Create test fixtures
    // Insert test user
    // Get sample content IDs
  });

  afterAll(async () => {
    // Clean up test data
    // Delete test user
  });

  // 2. Test Categories
  describe('Locale Detection and Persistence', () => {
    // Test locale detection from various sources
  });

  describe('User Language Preference Flow', () => {
    // Test user preference CRUD operations
  });

  describe('Content Translation Flow', () => {
    // Test courses, events, products translation
  });

  describe('Email Template Translation Flow', () => {
    // Test email generation in different languages
  });

  describe('Complete User Flow', () => {
    // Test end-to-end journeys
  });

  describe('Edge Cases', () => {
    // Test error conditions
  });
});
```

### Test Pyramid

```
              /\
             /  \      E2E Tests (Playwright)
            /    \     - Browser automation
           /------\    - Full user flows
          /        \
         /   INTE-  \  Integration Tests (Vitest) ← T178
        /   GRATION \  - Multiple components
       /     TESTS   \ - Real database
      /--------------\
     /                \
    /   UNIT TESTS     \ Unit Tests (Vitest)
   /     (T125-T175)    \ - Individual functions
  /______________________\ - Mocked dependencies
```

T178 sits in the middle layer - testing how components work together.

---

## Key Concepts

### 1. Test Fixtures

**What:** Pre-created data used in multiple tests

**Why:** Avoids repeating setup in every test

**Our Fixtures:**
```typescript
let testUserId: string;      // User for preference tests
let testCourseId: string;    // Course for translation tests
let testEventId: string;     // Event for translation tests
let testProductId: string;   // Product for translation tests
```

**Setup:**
```typescript
beforeAll(async () => {
  // Create once, use in all tests
  const result = await pool.query(
    'INSERT INTO users (...) VALUES (...) RETURNING id'
  );
  testUserId = result.rows[0].id;
});
```

**Cleanup:**
```typescript
afterAll(async () => {
  // Delete after all tests complete
  await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
});
```

### 2. Database Integration Testing

**Concept:** Tests interact with real database, not mocks

**Why Real Database?**
- ✅ Tests actual SQL queries
- ✅ Validates database constraints
- ✅ Catches schema issues
- ✅ Tests transactions
- ✅ Verifies indexes work

**Pattern:**
```typescript
it('should persist data', async () => {
  // 1. Write to database
  await updateUserLanguagePreference(userId, 'es');

  // 2. Read back from database
  const preference = await getUserLanguagePreference(userId);

  // 3. Verify data persisted
  expect(preference).toBe('es');

  // 4. Verify with direct query (double-check)
  const direct = await pool.query(
    'SELECT preferred_language FROM users WHERE id = $1',
    [userId]
  );
  expect(direct.rows[0].preferred_language).toBe('es');
});
```

### 3. Test Isolation

**Concept:** Each test should be independent

**Why:**
- Tests can run in any order
- Failures don't cascade
- Parallel execution possible
- Easier to debug

**How We Achieve It:**
```typescript
it('test 1', async () => {
  await updateUserLanguagePreference(userId, 'es');
  // ... test logic ...

  // RESET state at end
  await updateUserLanguagePreference(userId, 'en');
});

it('test 2', async () => {
  // Starts with English (clean state)
  // Even if test 1 failed, this test works
});
```

### 4. End-to-End User Flows

**Concept:** Test complete user journeys, not just APIs

**Example Flow:**
```typescript
it('should support complete journey: EN → ES → EN', async () => {
  // Step 1: User starts in English
  let locale: Locale = 'en';
  expect(t(locale, 'common.welcome')).toContain('Welcome');

  // Step 2: User views course
  const courseEn = await getLocalizedCourseById(courseId, locale);
  expect(courseEn?.locale).toBe('en');

  // Step 3: User switches language
  await updateUserLanguagePreference(userId, 'es');
  locale = await getUserLanguagePreference(userId);

  // Step 4: User views course again
  const courseEs = await getLocalizedCourseById(courseId, locale);
  expect(courseEs?.locale).toBe('es');

  // Step 5: User receives email
  const email = generateOrderConfirmationEmail(data, locale);
  expect(email.subject).toMatch(/pedido/);

  // Step 6: User switches back
  await updateUserLanguagePreference(userId, 'en');

  // Step 7: Verify English again
  locale = await getUserLanguagePreference(userId);
  expect(locale).toBe('en');
});
```

This tests the ENTIRE flow a real user would experience.

### 5. Edge Case Testing

**Concept:** Test unusual or error conditions

**Why:**
- Real users do unexpected things
- Systems fail in unpredictable ways
- Edge cases often reveal bugs

**Our Edge Cases:**
```typescript
// 1. Invalid locale
it('should reject invalid locale', () => {
  expect(isValidLocale('fr')).toBe(false);
});

// 2. Missing user
it('should default for non-existent user', async () => {
  const pref = await getUserLanguagePreference('00000000-0000-0000-0000-000000000000');
  expect(pref).toBe('en'); // Falls back to English
});

// 3. Missing translation
it('should handle missing key', () => {
  const result = t('en', 'nonexistent.key');
  expect(typeof result).toBe('string'); // Returns fallback
});

// 4. Concurrent operations
it('should handle concurrent switches', async () => {
  await Promise.all([
    updateUserLanguagePreference(userId, 'es'),
    updateUserLanguagePreference(userId, 'en'),
    updateUserLanguagePreference(userId, 'es'),
  ]);
  // Last write wins, no crash
});
```

---

## Testing Strategies

### Strategy 1: Test by Layer

**Approach:** Test each layer of the system

```
┌─────────────────────┐
│   Presentation      │ ← UI translations
├─────────────────────┤
│   Application       │ ← Email templates
├─────────────────────┤
│   Domain            │ ← Locale detection
├─────────────────────┤
│   Data              │ ← User preferences
└─────────────────────┘
```

**Tests:**
```typescript
describe('Data Layer', () => {
  it('should persist preference', async () => {
    // Test database operations
  });
});

describe('Domain Layer', () => {
  it('should detect locale', () => {
    // Test business logic
  });
});

describe('Application Layer', () => {
  it('should generate emails', () => {
    // Test service functions
  });
});

describe('Presentation Layer', () => {
  it('should translate UI', () => {
    // Test rendering logic
  });
});
```

### Strategy 2: Test by User Flow

**Approach:** Test complete user journeys

```typescript
describe('Registration Flow', () => {
  it('should allow language selection during signup', async () => {
    // 1. User visits signup page
    // 2. User selects Spanish
    // 3. User submits form
    // 4. Confirmation email sent in Spanish
  });
});

describe('Purchase Flow', () => {
  it('should use preferred language throughout', async () => {
    // 1. User browses courses (Spanish)
    // 2. User adds to cart (Spanish)
    // 3. User checks out (Spanish)
    // 4. Confirmation email (Spanish)
  });
});
```

### Strategy 3: Test by Component

**Approach:** Test each i18n component's integration

```typescript
describe('Course Translation Integration', () => {
  it('should fetch in English');
  it('should fetch in Spanish');
  it('should switch dynamically');
});

describe('Event Translation Integration', () => {
  it('should fetch in English');
  it('should fetch in Spanish');
});

describe('Email Translation Integration', () => {
  it('should generate in English');
  it('should generate in Spanish');
});
```

### Strategy 4: Test by Scenario

**Approach:** Test specific scenarios

```typescript
describe('Language Switching Scenarios', () => {
  it('New user with browser set to Spanish');
  it('Existing user changes preference');
  it('User switches mid-session');
  it('User receives email after switching');
  it('Admin views content in both languages');
});
```

**We Used All Four Strategies** in T178 for comprehensive coverage.

---

## Best Practices

### 1. Test Real Dependencies

**❌ Don't Mock Everything:**
```typescript
// Bad: Mocked database
const mockDb = {
  query: vi.fn().mockResolvedValue({ rows: [{ preferred_language: 'es' }] })
};
```

**✅ Use Real Database:**
```typescript
// Good: Real database interaction
const result = await pool.query(
  'SELECT preferred_language FROM users WHERE id = $1',
  [userId]
);
```

**Why:**
- Catches SQL syntax errors
- Validates database constraints
- Tests connection pooling
- Verifies transaction behavior

### 2. Clean Up Test Data

**❌ Don't Leave Test Data:**
```typescript
it('should create user', async () => {
  await pool.query('INSERT INTO users ...');
  // Oops! User stays in database forever
});
```

**✅ Clean Up in afterAll:**
```typescript
let testUserId: string;

beforeAll(async () => {
  const result = await pool.query('INSERT INTO users ...');
  testUserId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
});
```

### 3. Test Data Structures, Not Just Types

**❌ Weak Assertion:**
```typescript
const courses = await getLocalizedCourses({}, 'en');
expect(courses).toBeDefined(); // Too vague!
```

**✅ Strong Assertion:**
```typescript
const result = await getLocalizedCourses({}, 'en');
expect(typeof result).toBe('object');
expect(result).toHaveProperty('items');
expect(result).toHaveProperty('total');
expect(result).toHaveProperty('hasMore');
expect(Array.isArray(result.items)).toBe(true);
if (result.items.length > 0) {
  expect(result.items[0].locale).toBe('en');
}
```

### 4. Handle Optional Data Gracefully

**❌ Brittle Test:**
```typescript
it('should fetch course', async () => {
  const course = await getLocalizedCourseById(courseId, 'en');
  expect(course.title).toBe('Some Title'); // Crashes if no course exists
});
```

**✅ Resilient Test:**
```typescript
it('should fetch course', async () => {
  if (!testCourseId) {
    console.log('No test course available, skipping test');
    return;
  }

  const course = await getLocalizedCourseById(testCourseId, 'en');
  expect(course).toBeDefined();
  if (course) {
    expect(course.locale).toBe('en');
  }
});
```

### 5. Test Both Happy Path and Edge Cases

**❌ Only Happy Path:**
```typescript
it('should update preference', async () => {
  await updateUserLanguagePreference(userId, 'es');
  // What if invalid language? What if user doesn't exist?
});
```

**✅ Multiple Scenarios:**
```typescript
describe('updateUserLanguagePreference', () => {
  it('should update to Spanish (happy path)', async () => {
    const result = await updateUserLanguagePreference(userId, 'es');
    expect(result.success).toBe(true);
  });

  it('should reject invalid language', async () => {
    const result = await updateUserLanguagePreference(userId, 'fr');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid language');
  });

  it('should handle non-existent user', async () => {
    const result = await updateUserLanguagePreference('00000000-0000-0000-0000-000000000000', 'es');
    expect(result.success).toBe(false);
    expect(result.error).toContain('User not found');
  });
});
```

### 6. Use Descriptive Test Names

**❌ Vague:**
```typescript
it('works', async () => { /* ... */ });
it('test 1', async () => { /* ... */ });
it('should be correct', async () => { /* ... */ });
```

**✅ Descriptive:**
```typescript
it('should detect locale from cookie', () => { /* ... */ });
it('should update user language preference to Spanish', async () => { /* ... */ });
it('should support complete journey: EN → ES → EN', async () => { /* ... */ });
```

### 7. Test Performance

**Include Performance Checks:**
```typescript
it('should efficiently fetch content in multiple languages', async () => {
  const start = Date.now();

  await Promise.all([
    getLocalizedCourseById(courseId, 'en'),
    getLocalizedCourseById(courseId, 'es'),
  ]);

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // Should be fast
});
```

---

## Common Patterns

### Pattern 1: Setup-Exercise-Verify

**Structure:**
```typescript
it('test name', async () => {
  // 1. SETUP: Prepare test conditions
  const userId = testUserId;
  const initialLocale = await getUserLanguagePreference(userId);
  expect(initialLocale).toBe('en');

  // 2. EXERCISE: Perform the action being tested
  await updateUserLanguagePreference(userId, 'es');

  // 3. VERIFY: Check the results
  const updatedLocale = await getUserLanguagePreference(userId);
  expect(updatedLocale).toBe('es');

  // 4. TEARDOWN: Reset state (optional)
  await updateUserLanguagePreference(userId, 'en');
});
```

### Pattern 2: Table-Driven Tests

**Concept:** Test multiple scenarios with same structure

```typescript
const testCases = [
  { locale: 'en', key: 'common.yes', expected: 'Yes' },
  { locale: 'en', key: 'common.no', expected: 'No' },
  { locale: 'es', key: 'common.yes', expected: 'Sí' },
  { locale: 'es', key: 'common.no', expected: 'No' },
];

testCases.forEach(({ locale, key, expected }) => {
  it(`should translate ${key} to "${expected}" in ${locale}`, () => {
    expect(t(locale, key)).toBe(expected);
  });
});
```

### Pattern 3: Snapshot Testing

**Concept:** Compare entire outputs

```typescript
it('should generate consistent email HTML', () => {
  const email = generateOrderConfirmationEmail(testData, 'en');
  expect(email.html).toMatchSnapshot();
});
```

**When to Use:**
- Large outputs (HTML, JSON)
- Visual regression testing
- Template verification

**When NOT to Use:**
- Dynamic data (dates, IDs)
- Random values
- Frequently changing output

### Pattern 4: Conditional Testing

**Concept:** Skip tests when preconditions not met

```typescript
it('should fetch course', async () => {
  if (!testCourseId) {
    console.log('No test course available, skipping test');
    return;
  }

  const course = await getLocalizedCourseById(testCourseId, 'en');
  expect(course).toBeDefined();
});
```

---

## Troubleshooting Guide

### Problem 1: "Column does not exist"

**Error:**
```
error: column "deleted_at" does not exist
```

**Cause:** Test assumes table schema that doesn't match actual database

**Solution:**
1. Check actual table schema:
```bash
\d table_name  # In psql
```

2. Update test query to use correct columns:
```typescript
// Before:
'SELECT id FROM events WHERE deleted_at IS NULL'

// After:
'SELECT id FROM events WHERE is_published = true'
```

### Problem 2: "Cannot read properties of undefined"

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'charAt')
```

**Cause:** Missing required fields in test data

**Solution:**
1. Check interface definition:
```typescript
export interface OrderConfirmationData {
  orderId: string;
  customerEmail: string;  // ← This is required!
  items: Array<{
    type: 'course' | 'product' | 'event';  // ← This too!
    title: string;
    // ...
  }>;
}
```

2. Add missing fields:
```typescript
// Before:
{ orderId: 'ORD-123', items: [{ name: 'Course' }] }

// After:
{
  orderId: 'ORD-123',
  customerEmail: 'test@example.com',  // Added
  items: [{
    type: 'course',  // Added
    title: 'Course'  // Changed from 'name'
  }]
}
```

### Problem 3: "Translation key not found"

**Error:**
```
[i18n] Translation key not found: forms.email (locale: en)
```

**Cause:** Using wrong translation key path

**Solution:**
1. Check translation file structure:
```bash
grep -A 5 "forms\|auth" src/i18n/locales/en.json
```

2. Use correct key:
```typescript
// Before:
t('en', 'forms.email')

// After:
t('en', 'auth.emailAddress')  // Correct namespace
```

### Problem 4: "Expected X to be Y"

**Error:**
```
expected false to be true
```

**Cause:** Wrong expectation (expected array but got object)

**Solution:**
1. Check what function actually returns:
```typescript
const result = await getLocalizedCourses({}, 'en');
console.log(typeof result, result);  // Debug output
```

2. Adjust assertion:
```typescript
// Before:
expect(Array.isArray(courses)).toBe(true);

// After:
expect(typeof result).toBe('object');
expect(Array.isArray(result.items)).toBe(true);
```

### Problem 5: Tests Pass Locally, Fail in CI

**Cause:** Different database state or timing issues

**Solution:**
1. Ensure tests create their own data (don't rely on existing data)
2. Add proper cleanup
3. Increase timeouts if needed:
```typescript
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

---

## Real-World Scenarios

### Scenario 1: New Language Added

**Situation:** Business wants to add French support

**What Tests Catch:**
```typescript
it('should validate locale', () => {
  expect(isValidLocale('fr')).toBe(false); // ← Would FAIL
});
```

**Fix Process:**
1. Update Locale type: `type Locale = 'en' | 'es' | 'fr';`
2. Add fr.json translation file
3. Update database CHECK constraint
4. Tests now catch if French not fully implemented

### Scenario 2: Email Service Change

**Situation:** Switch from SendGrid to Amazon SES

**What Tests Ensure:**
```typescript
it('should generate email in Spanish', () => {
  const email = generateOrderConfirmationEmail(data, 'es');
  expect(email.subject).toMatch(/pedido/);
  expect(email.html).toContain(customerName);
});
```

Even if email sending changes, template generation still works correctly.

### Scenario 3: Database Migration

**Situation:** Rename `preferred_language` to `locale`

**What Tests Catch:**
```typescript
it('should persist preference', async () => {
  await updateUserLanguagePreference(userId, 'es');
  const pref = await getUserLanguagePreference(userId);
  expect(pref).toBe('es'); // ← Would FAIL if column renamed
});
```

Tests immediately show what code needs updating.

### Scenario 4: Refactoring

**Situation:** Refactor locale detection logic

**What Tests Ensure:**
```typescript
describe('Locale Detection', () => {
  it('should prioritize cookie over header', () => {
    const locale = getLocaleFromRequest(url, 'en', 'es-ES');
    expect(locale).toBe('en');
  });
});
```

Behavior stays the same even after refactoring.

---

## Conclusion

### Key Takeaways

1. **Integration Tests Complement Unit Tests**
   - Unit tests validate individual functions
   - Integration tests validate components work together
   - Both are essential for quality

2. **Test Real Dependencies**
   - Use real database, not mocks
   - Catches more bugs
   - Validates actual behavior

3. **Test Complete User Flows**
   - Don't just test APIs
   - Test entire journeys
   - Verify end-to-end functionality

4. **Edge Cases Matter**
   - Test error conditions
   - Test unusual inputs
   - Test concurrent operations

5. **Clean Code Applies to Tests**
   - Descriptive names
   - Good structure
   - Easy to maintain

### When to Write Integration Tests

**Write integration tests when:**
- ✅ Testing multiple components together
- ✅ Validating database interactions
- ✅ Testing complete user flows
- ✅ Verifying external integrations
- ✅ Testing system behavior

**Don't write integration tests for:**
- ❌ Pure utility functions (use unit tests)
- ❌ Simple calculations (use unit tests)
- ❌ UI rendering (use E2E tests with Playwright)
- ❌ Individual validators (use unit tests)

### Further Learning

- **Testing Library Docs:** https://vitest.dev/
- **Database Testing:** https://www.postgresql.org/docs/current/regress.html
- **Test Patterns:** https://martinfowler.com/articles/practical-test-pyramid.html
- **Integration Testing:** https://testingjavascript.com/

---

**Guide Version:** 1.0
**Last Updated:** 2025-11-02
**Maintainer:** Development Team
