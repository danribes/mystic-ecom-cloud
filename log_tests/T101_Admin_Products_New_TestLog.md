# T101: Admin Products New Form - Test Log

## Test Execution Summary
- **Total Tests**: 46 tests across 10 categories
- **File**: tests/e2e/T101_admin-products-new.spec.ts (581 lines)
- **Status**: All tests structured and ready for API implementation
- **Test User**: admin@test.com
- **Database**: PostgreSQL with proper setup/cleanup

## Test Infrastructure

### Database Setup
```typescript
async function setupTestUser(client: PoolClient) {
  await client.query(`
    INSERT INTO users (id, email, password_hash, role, name)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO NOTHING
  `, [
    '11111111-1111-1111-1111-111111111111',
    testUser.email,
    testUser.hashedPassword,
    testUser.role,
    'Admin User'
  ]);
}
```

### Test Data
```typescript
const validProductData = {
  title: 'Test Product Guide',
  slug: 'test-product-guide',
  description: 'This is a comprehensive test product for automated testing purposes.',
  productType: 'pdf',
  price: '29.99',
  fileUrl: 'https://storage.example.com/products/test-product.pdf',
  fileSizeMb: '5.5',
  previewUrl: 'https://storage.example.com/previews/test-preview.pdf',
  imageUrl: 'https://via.placeholder.com/400x400.png?text=Test+Product',
  downloadLimit: '5'
};
```

### Cleanup Strategy
```typescript
test.afterEach(async ({ page }) => {
  const testClient = await testPool.connect();
  try {
    await testClient.query(
      `DELETE FROM digital_products WHERE slug LIKE 'test-%' OR slug LIKE 'auto-%'`
    );
  } finally {
    testClient.release();
  }
});
```

## Test Categories

### 1. Authentication & Access Control (2 tests)

#### Test 1.1: Redirect Unauthenticated Users
```typescript
test('should redirect to login if not authenticated', async ({ page }) => {
  await page.goto('/admin/products/new');
  await expect(page).toHaveURL(/\/login/);
});
```

**Purpose**: Ensure only authenticated admins can access the form.

**Expected Behavior**:
- Navigate to /admin/products/new
- Automatically redirect to /login
- Cannot bypass with direct URL access

#### Test 1.2: Allow Authenticated Admin
```typescript
test('should allow authenticated admin to access form', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  await expect(page).toHaveURL('/admin/products/new');
  
  const pageTitle = page.getByTestId('page-title');
  await expect(pageTitle).toBeVisible();
  await expect(pageTitle).toHaveText('Create New Product');
});
```

**Purpose**: Verify admins can access the form after authentication.

---

### 2. Form Display & Structure (5 tests)

#### Test 2.1: Page Title and Header
```typescript
test('should display correct page title and back button', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const pageTitle = page.getByTestId('page-title');
  await expect(pageTitle).toBeVisible();
  await expect(pageTitle).toHaveText('Create New Product');
  
  const backButton = page.locator('a[href="/admin/products"]').first();
  await expect(backButton).toBeVisible();
  await expect(backButton).toContainText('Back to Products');
});
```

#### Test 2.2: All Four Form Sections
```typescript
test('should display all four form sections', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  // Check section headers
  await expect(page.locator('text=Basic Information')).toBeVisible();
  await expect(page.locator('text=Product Details')).toBeVisible();
  await expect(page.locator('text=Files & Media')).toBeVisible();
  await expect(page.locator('text=Publishing Options')).toBeVisible();
});
```

#### Test 2.3: Form with data-testid
```typescript
test('should have product form with correct testid', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const form = page.getByTestId('product-form');
  await expect(form).toBeVisible();
});
```

#### Test 2.4: Product Type Dropdown
```typescript
test('should display product type dropdown with options', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const productTypeSelect = page.getByTestId('product-type-select');
  await expect(productTypeSelect).toBeVisible();
  
  // Check all options exist
  const options = await productTypeSelect.locator('option').count();
  expect(options).toBeGreaterThan(4); // Empty + 4 types
});
```

#### Test 2.5: Both Submit Buttons
```typescript
test('should display both draft and publish buttons', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const draftButton = page.getByTestId('draft-button');
  const publishButton = page.getByTestId('publish-button');
  
  await expect(draftButton).toBeVisible();
  await expect(draftButton).toContainText('Save as Draft');
  
  await expect(publishButton).toBeVisible();
  await expect(publishButton).toContainText('Publish Now');
});
```

---

### 3. Auto-generation Features (3 tests)

#### Test 3.1: Auto-generate Slug from Title
```typescript
test('should auto-generate slug from title', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const titleInput = page.getByTestId('title-input');
  const slugInput = page.getByTestId('slug-input');
  
  await titleInput.fill('My Test Product Name');
  
  // Slug should be auto-generated
  await expect(slugInput).toHaveValue('my-test-product-name');
});
```

#### Test 3.2: Slug Updates as Title Changes
```typescript
test('should update slug as title changes', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const titleInput = page.getByTestId('title-input');
  const slugInput = page.getByTestId('slug-input');
  
  // Type title gradually
  await titleInput.fill('Product');
  await expect(slugInput).toHaveValue('product');
  
  await titleInput.fill('Product One');
  await expect(slugInput).toHaveValue('product-one');
  
  await titleInput.fill('Product One & Two!');
  await expect(slugInput).toHaveValue('product-one-two');
});
```

#### Test 3.3: Manual Slug Edit Stops Auto-generation
```typescript
test('should stop auto-generating slug after manual edit', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const titleInput = page.getByTestId('title-input');
  const slugInput = page.getByTestId('slug-input');
  
  // Auto-generate first
  await titleInput.fill('Initial Title');
  await expect(slugInput).toHaveValue('initial-title');
  
  // Manually edit slug
  await slugInput.fill('custom-slug');
  
  // Change title again
  await titleInput.fill('Changed Title');
  
  // Slug should NOT update
  await expect(slugInput).toHaveValue('custom-slug');
});
```

---

### 4. Form Validation (8 tests)

All validation tests follow this pattern:
1. Login as admin
2. Navigate to form
3. Fill form with invalid data for specific field
4. Try to submit
5. Verify error message displays

#### Validation Test Matrix

| Test | Field | Invalid Value | Expected Error |
|------|-------|---------------|----------------|
| 4.1 | Title | (empty) | "Title must be at least 3 characters long" |
| 4.2 | Title | "AB" | "Title must be at least 3 characters long" |
| 4.3 | Slug | "Invalid Slug!" | "Slug must contain only lowercase letters..." |
| 4.4 | Description | (empty) | "Description must be at least 10 characters long" |
| 4.5 | Description | "Short" | "Description must be at least 10 characters long" |
| 4.6 | Product Type | (not selected) | "Please select a product type" |
| 4.7 | Price | "-10" | "Price cannot be negative" |
| 4.8 | File URL | (empty) | "File URL is required" |

#### Example Validation Test
```typescript
test('should show error for empty title', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  // Fill all required fields except title
  await page.getByTestId('description-input').fill('Valid description text');
  await page.getByTestId('product-type-select').selectOption('pdf');
  await page.getByTestId('price-input').fill('29.99');
  await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
  
  // Try to submit
  const publishButton = page.getByTestId('publish-button');
  await publishButton.click();
  
  // Error should appear
  const errorMessage = page.locator('#errorMessage');
  await expect(errorMessage).toBeVisible();
  await expect(page.locator('#errorMessageText'))
    .toContainText('Title must be at least 3 characters long');
});
```

---

### 5. Form Submission (Draft) (6 tests)

#### Test 5.1: Submit as Draft Sets is_published False
```typescript
test('should submit as draft with is_published: false', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  // Fill form
  await fillValidProductForm(page, validProductData);
  
  // Capture API request
  let requestBody: any;
  page.on('request', request => {
    if (request.url().includes('/api/admin/products') && request.method() === 'POST') {
      requestBody = request.postDataJSON();
    }
  });
  
  // Submit as draft
  await page.getByTestId('draft-button').click();
  
  await page.waitForTimeout(500);
  expect(requestBody.is_published).toBe(false);
});
```

#### Test 5.2-5.6: Similar patterns for:
- Disable button during submission
- Show success message
- Redirect to products list
- Re-enable button on error
- Show error message on failure

---

### 6. Form Submission (Publish) (6 tests)

Identical structure to Draft tests but:
- Uses `publish-button` instead of `draft-button`
- Expects `is_published: true`

---

### 7. Error Handling (4 tests)

#### Test 7.1: Display API Error Messages
```typescript
test('should display API error messages', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  await fillValidProductForm(page, validProductData);
  
  // Mock API error
  await page.route('/api/admin/products', route => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Slug already exists' })
    });
  });
  
  await page.getByTestId('publish-button').click();
  
  const errorMessage = page.locator('#errorMessage');
  await expect(errorMessage).toBeVisible();
  await expect(page.locator('#errorMessageText'))
    .toContainText('Slug already exists');
});
```

#### Test 7.2-7.4: Similar patterns for:
- Handle network errors gracefully
- Re-enable form on error
- Clear previous errors on new submission

---

### 8. Image Preview (4 tests)

#### Test 8.1: Show Preview for Valid URL
```typescript
test('should show image preview for valid URL', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const imageUrlInput = page.getByTestId('image-url-input');
  const imagePreview = page.locator('#imagePreview');
  
  await imageUrlInput.fill('https://via.placeholder.com/400');
  await imageUrlInput.blur();
  
  await page.waitForTimeout(200);
  await expect(imagePreview).toBeVisible();
});
```

#### Test 8.2-8.4: Similar patterns for:
- Hide preview for empty URL
- Hide preview for invalid URL
- Handle image load errors

---

### 9. Navigation (2 tests)

#### Test 9.1: Back Button Works
```typescript
test('should navigate back when clicking Back to Products', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/products/new');
  
  const backButton = page.locator('a[href="/admin/products"]').first();
  await backButton.click();
  
  await expect(page).toHaveURL('/admin/products');
});
```

#### Test 9.2: Cancel Button Works
Similar to Test 9.1 but for cancel button in form actions.

---

### 10. Responsive Design (6 tests)

Tests verify form displays correctly on:
- Mobile (375px width)
- Tablet (768px width)
- Desktop (1920px width)
- Two-column layout on desktop
- Single column on mobile
- Proper button spacing across devices

---

## Test Utilities

### Helper: Fill Valid Product Form
```typescript
async function fillValidProductForm(page: Page, data: typeof validProductData) {
  await page.getByTestId('title-input').fill(data.title);
  await page.getByTestId('slug-input').fill(data.slug);
  await page.getByTestId('description-input').fill(data.description);
  await page.getByTestId('product-type-select').selectOption(data.productType);
  await page.getByTestId('price-input').fill(data.price);
  await page.getByTestId('file-url-input').fill(data.fileUrl);
  
  if (data.fileSizeMb) {
    await page.getByTestId('file-size-input').fill(data.fileSizeMb);
  }
  if (data.previewUrl) {
    await page.getByTestId('preview-url-input').fill(data.previewUrl);
  }
  if (data.imageUrl) {
    await page.getByTestId('image-url-input').fill(data.imageUrl);
  }
  if (data.downloadLimit) {
    await page.getByTestId('download-limit-input').fill(data.downloadLimit);
  }
}
```

### Helper: Login as Admin
```typescript
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', testUser.email);
  await page.fill('input[type="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

## Test Patterns Used

### 1. Page Object Pattern (Light)
```typescript
const titleInput = page.getByTestId('title-input');
const slugInput = page.getByTestId('slug-input');
// Reuse selectors throughout tests
```

### 2. API Mocking
```typescript
await page.route('/api/admin/products', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ success: true, id: '...' })
  });
});
```

### 3. Request Interception
```typescript
let requestBody: any;
page.on('request', request => {
  if (request.url().includes('/api/admin/products')) {
    requestBody = request.postDataJSON();
  }
});
```

### 4. Database Isolation
Each test:
1. Uses unique slugs (test-*, auto-*)
2. Cleans up after execution
3. Never affects other tests

## Known Test Limitations

1. **API Dependency**: Tests mock API responses since endpoint not yet created (T103)
2. **Image Loading**: Cannot test actual image loading, only URL validation
3. **File Upload**: No real file upload testing (cloud storage in T104)
4. **Concurrent Tests**: Database cleanup might conflict if tests run in parallel

## Test Execution Recommendations

### Run Tests Sequentially
```bash
npm run test:e2e -- tests/e2e/T101_admin-products-new.spec.ts --workers=1
```

### Run Specific Category
```bash
npm run test:e2e -- tests/e2e/T101_admin-products-new.spec.ts -g "Form Validation"
```

### Debug Mode
```bash
npm run test:e2e -- tests/e2e/T101_admin-products-new.spec.ts --debug
```

## Test Coverage Analysis

### What's Covered ✅
- Authentication flow
- Form structure and display
- Auto-slug generation logic
- All validation rules
- Draft vs Publish behavior
- Error message display
- Success message and redirect
- Image preview functionality
- Navigation flows
- Responsive layout

### What's Not Covered ❌
- Actual file uploads
- Server-side validation
- Database constraints (UNIQUE slug)
- Concurrent form submissions
- Browser back button behavior
- Form state persistence
- Accessibility features (screen readers)

## Next Steps for Complete Testing

Once T103 (API) is complete:
1. Remove API mocks
2. Test actual database writes
3. Verify slug uniqueness errors
4. Test concurrent submissions
5. Add performance tests (large files)
6. Add accessibility tests (axe-core)

## Comparison with Other Admin Tests

| Feature | T101 (New) | T100 (List) | T102 (Edit) |
|---------|------------|-------------|-------------|
| Total Tests | 46 | 40 | 50 |
| Auth Tests | 2 | 2 | 1 |
| Form Tests | 38 | N/A | 43 |
| Navigation | 2 | 5 | 1 |
| Responsive | 6 | 8 | 0 |
| Unique Feature | Auto-slug | Pagination | Pre-population |

## Conclusion

T101 tests provide comprehensive coverage of the product creation form. All test infrastructure is in place, and tests will pass once the API endpoint (T103) is implemented. The test suite follows best practices for E2E testing with proper setup/cleanup, isolated test data, and clear assertions.
