# T067 Admin Course Creation Guide

This guide explains the implementation of the course creation form in the admin interface and demonstrates best practices for form handling in Astro.

## Overview

The course creation form is a key part of the admin interface, allowing administrators to create new courses with comprehensive details and media content.

## Core Concepts

### 1. Form Organization

The form is organized into logical sections:

```html
<form id="courseForm" class="space-y-6">
  {/* Basic Information */}
  <div class="space-y-4">
    <h2>Basic Information</h2>
    <!-- Title, slug, descriptions -->
  </div>

  {/* Course Details */}
  <div class="space-y-4">
    <h2>Course Details</h2>
    <!-- Price, duration, level, etc -->
  </div>

  {/* Media */}
  <div class="space-y-4">
    <h2>Media</h2>
    <!-- Image URLs, video URLs -->
  </div>

  {/* Learning Content */}
  <div class="space-y-4">
    <h2>Learning Content</h2>
    <!-- Outcomes, prerequisites -->
  </div>
</form>
```

This structure:
- Makes the form easier to understand
- Groups related fields together
- Provides clear visual hierarchy
- Improves form accessibility

### 2. Data Types & Validation

The form handles various data types:

```typescript
interface CourseData {
  title: string;              // Required text
  slug: string;              // Auto-generated from title
  description: string;       // Required text
  price: number;            // Positive integer (cents)
  duration: number;         // Positive integer (seconds)
  level: CourseLevel;       // Enum: 'beginner' | 'intermediate' | 'advanced'
  category: string;         // Required text
  tags: string[];          // Optional array from comma-separated
  learningOutcomes: string[]; // Optional array from newlines
  prerequisites: string[];  // Optional array from newlines
  isPublished: boolean;    // Checkbox
  isFeatured: boolean;     // Checkbox
}
```

### 3. Form Processing

Client-side form handling:

```typescript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  
  // Transform data
  const data = {
    title: formData.get('title'),
    tags: formData.get('tags').split(',').map(t => t.trim()),
    price: parseInt(formData.get('price')),
    isPublished: formData.get('isPublished') === 'on'
  };
  
  try {
    await createCourse(data);
    toast.success('Course created');
    window.location.href = '/admin/courses';
  } catch (error) {
    toast.error(error.message);
  }
});
```

### 4. Responsive Design

The form uses Tailwind's responsive utilities:

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Fields are stacked on mobile, side-by-side on desktop -->
  <div class="space-y-2">
    <label>Field 1</label>
    <input />
  </div>
  <div class="space-y-2">
    <label>Field 2</label>
    <input />
  </div>
</div>
```

## Best Practices

1. **Field Organization**
   - Group related fields
   - Use clear section headers
   - Provide visual separation

2. **Validation**
   - HTML5 validation attributes
   - Required field indicators
   - Clear error messages
   - Service-level validation

3. **User Experience**
   - Auto-generate where possible
   - Clear success/error feedback
   - Proper field types
   - Responsive layout

4. **Form Processing**
   - Prevent double submission
   - Transform data appropriately
   - Handle all error cases
   - Provide feedback
   - Redirect on success

## Common Patterns

### Auto-generating Slug

```typescript
titleInput.addEventListener('input', () => {
  slugInput.value = titleInput.value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
});
```

### Array Field Processing

```typescript
// Convert comma-separated string to array
const tags = formData.get('tags')
  .split(',')
  .map(tag => tag.trim())
  .filter(Boolean);

// Convert newlines to array
const outcomes = formData.get('learningOutcomes')
  .split('\n')
  .map(outcome => outcome.trim())
  .filter(Boolean);
```

### Required Field Marking

```html
<label for="title">
  Title <span class="text-red-600">*</span>
</label>
<input
  required
  id="title"
  name="title"
/>
```

## Testing

Key test scenarios:

1. **Happy Path**
   ```typescript
   test('should create course successfully', async ({ page }) => {
     await page.fill('#title', 'Test Course');
     await page.fill('#price', '9900');
     await page.click('button[type="submit"]');
     await expect(page).toHaveURL('/admin/courses');
   });
   ```

2. **Validation**
   ```typescript
   test('should show validation errors', async ({ page }) => {
     await page.click('button[type="submit"]');
     await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
   });
   ```

3. **Auto-generation**
   ```typescript
   test('should generate slug', async ({ page }) => {
     await page.fill('#title', 'Test Course!');
     await expect(page.locator('#slug')).toHaveValue('test-course');
   });
   ```

## Troubleshooting

Common issues and solutions:

1. **Form Submission Issues**
   - Check network tab for errors
   - Verify all required fields
   - Check data transformations

2. **Validation Problems**
   - Inspect HTML5 validation attributes
   - Check service validation logic
   - Verify data types match expectations

3. **Layout Issues**
   - Check responsive breakpoints
   - Verify Tailwind classes
   - Test on different screen sizes

## See Also

- Course service documentation
- Astro form handling
- Tailwind CSS documentation
- Playwright testing guide