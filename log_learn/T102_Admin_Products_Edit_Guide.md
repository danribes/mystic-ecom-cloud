# T102: Admin Products Edit Form - Learning Guide

## What Was Built
An admin interface page for editing existing digital products, featuring dynamic data loading, form pre-population, real-time validation, and intelligent slug change warnings.

## Key Learning Topics

### 1. Dynamic Route Parameters in Astro
Learn how to capture URL parameters and use them for database queries.

#### Pattern: [id] Folder Structure
```
src/pages/admin/products/
├── index.astro          # List page (/admin/products)
├── new.astro           # Create page (/admin/products/new)
└── [id]/
    └── edit.astro      # Edit page (/admin/products/:id/edit)
```

#### Accessing Route Parameters
```typescript
// In edit.astro
const { id } = Astro.params;  // Extracts ID from URL

// Examples:
// /admin/products/123e4567-e89b-12d3-a456-426614174000/edit
// → id = "123e4567-e89b-12d3-a456-426614174000"
```

#### Key Insight
Dynamic routes in Astro use **bracket notation** `[param]` for folder names. This creates a catch-all route that matches any value in that position.

---

### 2. Database Data Loading in Astro
Understand server-side data fetching before page render.

#### Loading Existing Data
```typescript
// 1. Get pool connection
const pool = getPool();

// 2. Query database
const result = await pool.query(
  'SELECT * FROM digital_products WHERE id = $1',
  [id]  // Parameterized query prevents SQL injection
);

// 3. Handle not found
if (result.rows.length === 0) {
  return Astro.redirect('/admin/products?error=not-found');
}

// 4. Extract data
const product = result.rows[0];
```

#### Error Handling Patterns
```typescript
try {
  const result = await pool.query(...);
  if (result.rows.length === 0) {
    notFound = true;  // Handle gracefully
  }
} catch (error) {
  console.error('Error loading product:', error);
  return Astro.redirect('/admin/products?error=load-failed');
}
```

#### Key Insight
All database queries in Astro **run on the server** during page build/render. The client never sees the SQL queries or raw database responses.

---

### 3. Form Pre-population Techniques
Master various methods of populating HTML form fields with existing data.

#### Text Inputs
```html
<input
  type="text"
  id="title"
  value={product.title}  <!-- Server-side value injection -->
  data-testid="title-input"
/>
```

#### Textareas (different syntax!)
```html
<textarea id="description">{product.description}</textarea>
<!-- Note: Value goes BETWEEN tags, not in attribute -->
```

#### Dropdowns with Pre-selection
```html
<select id="productType">
  {productTypes.map(type => (
    <option 
      value={type.value}
      selected={product.product_type === type.value}  <!-- Conditional -->
    >
      {type.label}
    </option>
  ))}
</select>
```

#### Checkboxes
```html
<input
  type="checkbox"
  id="isPublished"
  checked={product.is_published}  <!-- Boolean attribute -->
/>
```

#### Key Insight
Different HTML elements require **different pre-population patterns**. Text inputs use `value=`, textareas use inner content, checkboxes use `checked`.

---

### 4. DECIMAL to Number Conversion
Learn to handle PostgreSQL DECIMAL types in JavaScript.

#### The Problem
```javascript
// PostgreSQL returns DECIMAL as string
product.price = "29.99"  // ❌ String, not number
product.file_size_mb = "5.50"  // ❌ String
```

#### The Solution
```typescript
// Convert to Number for display
value={Number(product.price).toFixed(2)}  // ✅ "29.99"
value={product.file_size_mb ? Number(product.file_size_mb).toFixed(2) : ''}
```

#### Why toFixed(2)?
```javascript
Number(29.99).toString()      // "29.99" - may lose precision
Number(29.99).toFixed(2)      // "29.99" - always 2 decimals
Number(30).toFixed(2)         // "30.00" - ensures consistency
```

#### Key Insight
Always convert DECIMAL fields to Number **before** displaying in forms, and use `toFixed()` to maintain precision and format consistency.

---

### 5. Slug Change Warning System
Implement user-friendly warnings for potentially breaking changes.

#### Storing Original Value
```html
<input
  type="text"
  id="slug"
  value={product.slug}
  data-original-slug={product.slug}  <!-- Store for comparison -->
/>

<p id="slugWarning" style="display: none;">
  ⚠️ Changing the slug will break existing links to this product
</p>
```

#### Detecting Changes
```javascript
const originalSlug = slugInput.dataset.originalSlug;

slugInput.addEventListener('input', () => {
  if (slugInput.value !== originalSlug) {
    slugWarning.style.display = 'block';  // Show warning
  } else {
    slugWarning.style.display = 'none';   // Hide if reverted
  }
});
```

#### User Experience Benefits
1. **Awareness**: Users know they're making a breaking change
2. **Reversibility**: Easy to revert by seeing original value
3. **Non-blocking**: Warning doesn't prevent the change

#### Key Insight
Store original values in **data attributes** for client-side comparison without making extra server requests.

---

### 6. Conditional Auto-generation
Balance between automation and user control.

#### Smart Slug Generation
```javascript
titleInput.addEventListener('input', (e) => {
  // Only auto-generate if slug is empty OR was auto-generated
  if (!slugInput.value || slugInput.dataset.autoGenerated === 'true') {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    slugInput.value = slug;
    slugInput.dataset.autoGenerated = 'true';
  }
});

slugInput.addEventListener('input', () => {
  slugInput.dataset.autoGenerated = 'false';  // User edited
});
```

#### Behavior
```
Initial load: slug = "existing-product" → No auto-generation
User clears slug → Auto-generation enabled
User types title → Slug auto-fills
User edits slug → Auto-generation disabled
```

#### Key Insight
Use **state flags** (like `data-auto-generated`) to track whether values were set automatically or manually by the user.

---

### 7. Metadata Display
Show read-only contextual information alongside editable fields.

#### Timestamp Formatting
```html
<dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
  <div>
    <dt class="text-sm font-medium text-gray-500">Created</dt>
    <dd class="mt-1 text-sm text-gray-900">
      {new Date(product.created_at).toLocaleString()}
    </dd>
  </div>
  <div>
    <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
    <dd class="mt-1 text-sm text-gray-900">
      {new Date(product.updated_at).toLocaleString()}
    </dd>
  </div>
</dl>
```

#### Output Examples
```
Created: 12/15/2024, 3:30:45 PM
Last Updated: 12/20/2024, 9:15:22 AM
```

#### Semantic HTML
```html
<dl> = Description List
<dt> = Definition Term (label)
<dd> = Definition Description (value)
```

#### Key Insight
Use **semantic HTML** (`<dl>`, `<dt>`, `<dd>`) for metadata display. It improves accessibility and SEO.

---

### 8. PUT vs POST HTTP Methods
Understand REST conventions for update operations.

#### HTTP Method Semantics
```javascript
// CREATE (T101) - POST
fetch('/api/admin/products', {
  method: 'POST',
  body: JSON.stringify(newProduct)
});

// UPDATE (T102) - PUT
fetch(`/api/admin/products/${productId}`, {
  method: 'PUT',
  body: JSON.stringify(updatedProduct)
});
```

#### REST Conventions
| Method | Purpose | URL | Body | Idempotent? |
|--------|---------|-----|------|-------------|
| POST | Create | /products | New data | No |
| PUT | Update | /products/:id | Full replacement | Yes |
| PATCH | Partial Update | /products/:id | Changed fields | Yes |
| DELETE | Delete | /products/:id | None | Yes |

#### Idempotency Explained
```javascript
// PUT is idempotent (same result if called multiple times)
PUT /products/123 { title: "New Title" }
→ Sets title to "New Title"
→ Calling again: Same result

// POST is NOT idempotent
POST /products { title: "New Product" }
→ Creates product with ID 456
→ Calling again: Creates ANOTHER product with ID 789
```

#### Key Insight
Use **PUT** for updates because it's **idempotent** - safe to retry without creating duplicates.

---

### 9. Image Preview with Error Handling
Implement robust image loading with fallback.

#### Complete Pattern
```javascript
const imageUrlInput = document.getElementById('imageUrl');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = document.getElementById('imagePreviewImg');

imageUrlInput.addEventListener('blur', () => {
  const url = imageUrlInput.value.trim();
  
  // Validate URL format
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    imagePreviewImg.src = url;
    imagePreview.classList.remove('hidden');
    
    // Handle load errors
    imagePreviewImg.onerror = () => {
      imagePreview.classList.add('hidden');
    };
  } else {
    imagePreview.classList.add('hidden');
  }
});
```

#### Progressive Enhancement
```html
<!-- Initial state: Show if URL exists -->
<div id="imagePreview" class={product.image_url ? '' : 'hidden'}>
  <img 
    id="imagePreviewImg" 
    src={product.image_url || ''} 
    alt="Product preview" 
    class="w-48 h-48 object-cover rounded-lg border"
  />
</div>
```

#### Key Insight
Always handle **image load failures** with `onerror` handlers to prevent broken image icons from showing.

---

### 10. Form Validation Reuse
Share validation logic between create and edit forms.

#### Identical Validation Rules
```javascript
// Both T101 and T102 use the same rules
if (!productData.title || productData.title.length < 3) {
  errorMessageText.textContent = 'Title must be at least 3 characters long';
  return;
}

if (!productData.slug || !/^[a-z0-9-]+$/.test(productData.slug)) {
  errorMessageText.textContent = 'Slug must contain only lowercase letters, numbers, and hyphens';
  return;
}
```

#### Validation Checklist
1. ✅ Title: Min 3 characters
2. ✅ Slug: Pattern `^[a-z0-9-]+$`
3. ✅ Description: Min 10 characters
4. ✅ Product Type: Required selection
5. ✅ Price: Non-negative number
6. ✅ File URL: Required, valid URL

#### Refactoring Opportunity
```javascript
// Could extract to shared module
// src/lib/validation/product.ts
export function validateProduct(productData) {
  const errors = [];
  
  if (!productData.title || productData.title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  }
  
  // ... more validations
  
  return errors;
}
```

#### Key Insight
When the same validation appears in multiple places, it's a candidate for **extraction into a shared module**.

---

## Testing Insights

### 1. Data-Driven Test Setup
```typescript
const TEST_PRODUCT = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Test Product for Edit',
  slug: 'test-product-for-edit',
  description: 'Test description for editing',
  price: 29.99,
  product_type: 'pdf',
  file_url: 'https://storage.example.com/test.pdf',
  file_size_mb: 5.5,
  preview_url: 'https://storage.example.com/test-preview.pdf',
  image_url: 'https://storage.example.com/test-image.jpg',
  download_limit: 5,
  is_published: true
};
```

**Why?** Single source of truth for test data. Easy to modify, consistent across all tests.

### 2. Page Object Pattern Alternative
```typescript
// Instead of:
await page.fill('#title', 'New Title');
await page.fill('#slug', 'new-slug');

// Use:
const titleInput = page.getByTestId('title-input');
const slugInput = page.getByTestId('slug-input');
await titleInput.fill('New Title');
await slugInput.fill('new-slug');
```

**Benefits**: Selectors defined once, reusable, more maintainable.

### 3. Testing Pre-population
```typescript
// Key pattern: Test initial state
test('should pre-populate title field', async ({ page }) => {
  await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
  
  const titleInput = page.getByTestId('title-input');
  await expect(titleInput).toHaveValue(TEST_PRODUCT.title);
  //                        ^^^^^^^^^^^ Check pre-filled value
});
```

### 4. Testing Warnings
```typescript
// Pattern: Test initial hidden state, then trigger, then verify
const slugWarning = page.locator('#slugWarning');

await expect(slugWarning).toHaveCSS('display', 'none');  // Hidden
await slugInput.fill('new-slug');
await expect(slugWarning).toHaveCSS('display', 'block'); // Visible
```

---

## Common Pitfalls & Solutions

### Pitfall 1: String vs Number Types
```typescript
// ❌ WRONG
<input type="number" value={product.price} />
// product.price = "29.99" (string from DB)
// → Browser shows "29.99" but .value is still string

// ✅ CORRECT
<input type="number" value={Number(product.price).toFixed(2)} />
// → Ensures number type and consistent formatting
```

### Pitfall 2: Textarea Pre-population
```html
<!-- ❌ WRONG -->
<textarea value={product.description}></textarea>

<!-- ✅ CORRECT -->
<textarea>{product.description}</textarea>
```

### Pitfall 3: Checkbox State
```html
<!-- ❌ WRONG -->
<input type="checkbox" value={product.is_published} />

<!-- ✅ CORRECT -->
<input type="checkbox" checked={product.is_published} />
```

### Pitfall 4: UUID Validation
```typescript
// ❌ WRONG: Assuming ID is valid
const { id } = Astro.params;
const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

// ✅ BETTER: Validate ID format first
const { id } = Astro.params;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!id || !uuidRegex.test(id)) {
  return Astro.redirect('/admin/products?error=invalid-id');
}
```

### Pitfall 5: Missing 404 Handling
```typescript
// ❌ WRONG
const result = await pool.query(...);
const product = result.rows[0];  // ← Undefined if not found!

// ✅ CORRECT
const result = await pool.query(...);
if (result.rows.length === 0) {
  return Astro.redirect('/admin/products?error=not-found');
}
const product = result.rows[0];
```

---

## Best Practices Learned

### 1. Defensive Data Loading
```typescript
// Always check existence before accessing
if (!id) return Astro.redirect('/admin/products');
if (result.rows.length === 0) return Astro.redirect('...');
```

### 2. User-Friendly Warnings
```typescript
// Non-blocking warnings for potentially dangerous actions
if (slugInput.value !== originalSlug) {
  // Show warning but don't prevent action
  slugWarning.style.display = 'block';
}
```

### 3. Consistent Formatting
```typescript
// Use toFixed() for all decimal displays
Number(product.price).toFixed(2)           // "29.99"
Number(product.file_size_mb).toFixed(2)    // "5.50"
```

### 4. Progressive Enhancement
```html
<!-- Works without JavaScript (server-side values) -->
<input value={product.title} />

<!-- Enhanced with JavaScript (auto-slug, warnings) -->
<script>
  // Additional client-side features
</script>
```

### 5. Semantic HTML
```html
<!-- Use appropriate elements -->
<dl>  <!-- Description list for metadata -->
<dt>Created</dt>  <!-- Term -->
<dd>12/15/2024</dd>  <!-- Definition -->
```

---

## Architecture Patterns

### 1. Server-Client Data Flow
```
┌─────────────────┐
│ Browser Request │
│ /products/123/edit
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│ Astro Server            │
│ 1. Extract ID from URL  │
│ 2. Query database       │
│ 3. Check existence      │
│ 4. Render HTML with data│
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│ Browser                 │
│ 1. Display pre-filled   │
│ 2. Client-side enhance  │
│ 3. Submit via fetch     │
└─────────────────────────┘
```

### 2. Edit Form Workflow
```
User navigates
    ↓
Check auth (server)
    ↓
Extract ID from URL
    ↓
Query database
    ↓
Not found? → Redirect 404
    ↓
Found! → Pre-populate form
    ↓
User modifies fields
    ↓
Client-side validation
    ↓
Submit to PUT /api/products/:id
    ↓
Success → Redirect to list
Error → Show message, re-enable form
```

---

## Related Concepts

### Compare: Create vs Edit
| Feature | Create (T101) | Edit (T102) |
|---------|---------------|-------------|
| **Data Source** | Empty/defaults | Database query |
| **Route** | Static (/new) | Dynamic (/:id/edit) |
| **HTTP Method** | POST | PUT |
| **Slug** | Auto-generate | Warn on change |
| **Metadata** | Not shown | Display timestamps |

### Future Enhancements (T103)
1. **Slug Validation**: Check uniqueness excluding current product
2. **Optimistic UI**: Show success immediately, rollback on error
3. **File Upload**: Replace URL inputs with drag-drop upload
4. **Version History**: Track all changes to product
5. **Concurrent Editing**: Detect if another admin is editing same product

---

## Summary
T102 demonstrates advanced form handling patterns including dynamic routing, database integration, intelligent pre-population, and user-friendly warnings. The key takeaway is balancing **server-side data loading** with **client-side enhancements** for optimal UX.
