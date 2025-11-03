# Phase 3: Test-Driven Development (T029-T031)

## Overview

Before implementing the shopping cart and checkout features, we wrote comprehensive tests. This is called **Test-Driven Development (TDD)** - writing tests before code.

---

## Why Test-Driven Development?

### Traditional Approach (Code-First)
```
1. Write code
2. Manual testing (click around)
3. Find bugs
4. Fix bugs
5. Repeat...
```

**Problems:**
- Bugs found late (costly to fix)
- No regression testing (new changes break old features)
- Hard to refactor (fear of breaking things)

### TDD Approach (Test-First)
```
1. Write failing test (red)
2. Write minimal code to pass test (green)
3. Refactor code (keep tests passing)
4. Repeat...
```

**Benefits:**
- Bugs caught immediately
- Safe refactoring (tests verify nothing broke)
- Documentation (tests show how code should work)
- Better design (testable code = well-designed code)

---

## T029: Course Service Tests

### File: `tests/unit/T029-course-service.test.ts`

### What We Test

The course service handles all course-related business logic:
- Fetching courses from database
- Filtering by category/level
- Searching by keyword
- Checking if user owns a course

### Example Test: Get All Courses

```typescript
describe('CourseService - getCourses', () => {
  it('should return all published courses', async () => {
    // Arrange: Setup test data
    const mockCourses = [
      { id: '1', title: 'Meditation 101', is_published: true, price: 49.99 },
      { id: '2', title: 'Yoga Basics', is_published: true, price: 39.99 }
    ];
    
    // Mock database to return test data
    vi.spyOn(db, 'query').mockResolvedValue({ rows: mockCourses });
    
    // Act: Call the function we're testing
    const courses = await getCourses();
    
    // Assert: Verify results
    expect(courses).toHaveLength(2);
    expect(courses[0].title).toBe('Meditation 101');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE is_published = true')
    );
  });
});
```

### Anatomy of a Test

**1. Arrange (Setup)**
```typescript
const mockCourses = [/* test data */];
vi.spyOn(db, 'query').mockResolvedValue({ rows: mockCourses });
```
- Create test data
- Mock external dependencies (database)
- Set up initial state

**2. Act (Execute)**
```typescript
const courses = await getCourses();
```
- Call the function being tested
- Capture the result

**3. Assert (Verify)**
```typescript
expect(courses).toHaveLength(2);
expect(courses[0].title).toBe('Meditation 101');
```
- Check if result matches expectations
- Verify side effects (was database called correctly?)

### Why Mock the Database?

**Without Mocking (Integration Test):**
```typescript
it('should get courses', async () => {
  // Actually inserts into test database
  await db.query('INSERT INTO courses...');
  
  const courses = await getCourses();
  
  expect(courses).toHaveLength(1);
  
  // Cleanup required
  await db.query('DELETE FROM courses...');
});
```

**Problems:**
- Slow (database I/O)
- Requires test database setup
- Tests can interfere with each other
- Hard to test edge cases (network errors, etc.)

**With Mocking (Unit Test):**
```typescript
it('should get courses', async () => {
  vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
  
  const courses = await getCourses();
  
  expect(courses).toHaveLength(0);
});
```

**Benefits:**
- Fast (no I/O, runs in milliseconds)
- Isolated (tests don't affect each other)
- Easy to test errors: `mockRejectedValue(new Error('Connection failed'))`

### Testing Edge Cases

```typescript
describe('Error Handling', () => {
  it('should throw error if database query fails', async () => {
    // Mock database failure
    vi.spyOn(db, 'query').mockRejectedValue(new Error('Connection lost'));
    
    // Verify error is thrown
    await expect(getCourses()).rejects.toThrow('Connection lost');
  });
  
  it('should return empty array if no courses found', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
    
    const courses = await getCourses();
    
    expect(courses).toEqual([]);
  });
});
```

**Why test errors?**
- Production systems fail (database down, network issues)
- Users should see helpful error messages
- Application shouldn't crash

---

## T030: Cart Service Tests

### File: `tests/unit/T030-cart-service.test.ts`

### What We Test

Cart service manages shopping cart operations:
- Adding items to cart
- Removing items
- Updating quantities
- Calculating totals with tax

### Example Test: Add to Cart

```typescript
describe('CartService - addToCart', () => {
  it('should add course to cart', async () => {
    const sessionId = 'session-123';
    const courseId = 'course-456';
    const course = { id: courseId, price: 49.99, title: 'Meditation' };
    
    // Mock course lookup
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [course] });
    
    // Mock cart insertion
    const insertSpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
    
    await addToCart(sessionId, courseId, 1);
    
    // Verify course was looked up
    expect(insertSpy).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cart_items'),
      expect.arrayContaining([sessionId, 'course', courseId, 1, 49.99])
    );
  });
  
  it('should prevent adding same course twice', async () => {
    const sessionId = 'session-123';
    const courseId = 'course-456';
    
    // Mock: course already in cart
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [{ item_id: courseId }]
    });
    
    await expect(addToCart(sessionId, courseId, 1))
      .rejects.toThrow('Course already in cart');
  });
});
```

### Testing Business Rules

**Rule: Can't add same course twice**
```typescript
it('should prevent duplicate courses', async () => {
  // User tries to add course they already have
  vi.spyOn(db, 'query').mockResolvedValue({
    rows: [{ item_id: 'course-123' }]  // Already in cart
  });
  
  await expect(addToCart('session-1', 'course-123', 1))
    .rejects.toThrow('Course already in cart');
});
```

**Rule: Quantity must be between 1-10**
```typescript
it('should reject quantity < 1', async () => {
  await expect(addToCart('session-1', 'course-1', 0))
    .rejects.toThrow('Quantity must be between 1 and 10');
});

it('should reject quantity > 10', async () => {
  await expect(addToCart('session-1', 'course-1', 11))
    .rejects.toThrow('Quantity must be between 1 and 10');
});
```

### Testing Calculations

```typescript
describe('CartService - calculateTotal', () => {
  it('should calculate correct subtotal', () => {
    const items = [
      { price: 49.99, quantity: 1 },
      { price: 29.99, quantity: 2 }
    ];
    
    const total = calculateTotal(items);
    
    expect(total.subtotal).toBe(109.97);  // 49.99 + (29.99 * 2)
  });
  
  it('should calculate 8% tax', () => {
    const items = [{ price: 100.00, quantity: 1 }];
    
    const total = calculateTotal(items);
    
    expect(total.tax).toBe(8.00);  // 100 * 0.08
    expect(total.total).toBe(108.00);  // 100 + 8
  });
  
  it('should round to 2 decimal places', () => {
    const items = [{ price: 33.33, quantity: 1 }];
    
    const total = calculateTotal(items);
    
    // 33.33 * 0.08 = 2.6664
    expect(total.tax).toBe(2.67);  // Rounded up
    expect(total.total).toBe(36.00);
  });
});
```

**Why test calculations?**
- Money calculations must be exact
- Rounding errors can accumulate
- Tax calculations vary by jurisdiction
- Auditing requires accuracy

---

## T031: Order Service Tests

### File: `tests/unit/T031-order-service.test.ts`

### What We Test

Order service handles purchase processing:
- Creating orders from cart
- Storing payment information
- Updating order status
- Retrieving user orders

### Example Test: Create Order

```typescript
describe('OrderService - createOrder', () => {
  it('should create order from cart items', async () => {
    const userId = 'user-123';
    const cartItems = [
      { item_id: 'course-1', price: 49.99, quantity: 1 }
    ];
    
    // Mock database calls
    const querySpy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: cartItems })  // Get cart
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] });  // Insert order
    
    const order = await createOrder(userId, 'session-123', {
      stripePaymentIntentId: 'pi_123',
      stripeSessionId: 'sess_456'
    });
    
    expect(order.id).toBe('order-1');
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO orders'),
      expect.arrayContaining([userId, 49.99, 'completed'])
    );
  });
  
  it('should create order items for each cart item', async () => {
    const cartItems = [
      { item_id: 'course-1', item_type: 'course', price: 49.99 },
      { item_id: 'course-2', item_type: 'course', price: 29.99 }
    ];
    
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: cartItems })
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] })
      .mockResolvedValueOnce({ rows: [] });  // Insert order items
    
    await createOrder('user-123', 'session-123', {});
    
    // Verify order_items were inserted
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO order_items'),
      expect.arrayContaining(['order-1', 'course', 'course-1', 1, 49.99])
    );
  });
});
```

### Testing Transaction Safety

```typescript
describe('OrderService - Transaction Safety', () => {
  it('should rollback order if payment fails', async () => {
    const beginSpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
    const rollbackSpy = vi.spyOn(db, 'query');
    
    // Mock payment failure
    vi.spyOn(stripe, 'confirmPayment').mockRejectedValue(
      new Error('Card declined')
    );
    
    await expect(createOrder('user-1', 'session-1', {}))
      .rejects.toThrow('Card declined');
    
    // Verify rollback was called
    expect(rollbackSpy).toHaveBeenCalledWith('ROLLBACK');
  });
});
```

**Why transactions?**
```sql
BEGIN;  -- Start transaction
  INSERT INTO orders ...;
  INSERT INTO order_items ...;
  DELETE FROM cart_items ...;
COMMIT;  -- Save all changes

-- If ANY step fails:
ROLLBACK;  -- Undo ALL changes
```

**Without transactions:**
- Order created ✅
- Order items fail ❌
- Result: Order exists with no items (data corruption)

**With transactions:**
- Order created ✅
- Order items fail ❌
- Transaction rolled back ✅
- Result: No order, no corruption (all or nothing)

---

## Testing Best Practices

### 1. Test Names Should Be Clear

```typescript
// ❌ Bad: Vague
it('should work', async () => { ... });

// ✅ Good: Specific
it('should add course to cart with correct price', async () => { ... });
```

### 2. One Assertion Per Test (Ideally)

```typescript
// ❌ Bad: Testing multiple things
it('should add to cart', async () => {
  const result = await addToCart(...);
  expect(result.id).toBeDefined();
  expect(result.price).toBe(49.99);
  expect(result.quantity).toBe(1);
  expect(db.query).toHaveBeenCalled();  // If this fails, we don't know which assertion broke
});

// ✅ Good: Focused tests
it('should generate cart item ID', async () => {
  const result = await addToCart(...);
  expect(result.id).toBeDefined();
});

it('should store correct price', async () => {
  const result = await addToCart(...);
  expect(result.price).toBe(49.99);
});
```

### 3. Use Descriptive Test Data

```typescript
// ❌ Bad: Magic numbers
const user = { id: '1', email: 'a@b.c' };

// ✅ Good: Clear intent
const testUser = {
  id: 'test-user-id-123',
  email: 'test.user@example.com',
  role: 'user'
};
```

### 4. Test Error Cases

```typescript
describe('Error Handling', () => {
  it('should handle database connection error', async () => { ... });
  it('should handle invalid input', async () => { ... });
  it('should handle missing data', async () => { ... });
  it('should handle concurrent access', async () => { ... });
});
```

---

## Test Coverage Report

After running tests, Vitest generates a coverage report:

```bash
npm run test:coverage
```

**Example Output:**
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
src/lib/cart.ts     |   95.2  |   88.9   |  100.0  |   94.7
src/lib/courses.ts  |   92.3  |   85.7   |  100.0  |   91.8
src/lib/orders.ts   |   88.5  |   80.0   |   87.5  |   87.9
```

**What It Means:**
- **Stmts**: Percentage of statements executed
- **Branch**: Percentage of if/else branches tested
- **Funcs**: Percentage of functions called
- **Lines**: Percentage of code lines executed

**Goal:** 70%+ coverage for production code

---

## Key Takeaways

1. **TDD Benefits**
   - Catches bugs early (before code is written)
   - Documents expected behavior
   - Enables safe refactoring
   - Forces better design (testable = modular)

2. **Unit Testing**
   - Fast (milliseconds)
   - Isolated (no external dependencies)
   - Uses mocks/spies
   - Tests one function at a time

3. **Test Structure**
   - Arrange: Set up test data
   - Act: Execute function
   - Assert: Verify results

4. **What to Test**
   - Happy path (normal operation)
   - Edge cases (empty, null, max values)
   - Error cases (network failures, invalid input)
   - Business rules (pricing, permissions, limits)

---

**Related Files:**
- [tests/unit/T029-course-service.test.ts](/home/dan/web/tests/unit/T029-course-service.test.ts)
- [tests/unit/T030-cart-service.test.ts](/home/dan/web/tests/unit/T030-cart-service.test.ts)
- [tests/unit/T031-order-service.test.ts](/home/dan/web/tests/unit/T031-order-service.test.ts)

**Next Guide:** [Services Implementation (T032-T035)](./phase3-services.md)
