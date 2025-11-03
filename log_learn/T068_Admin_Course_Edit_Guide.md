# T068: Admin Course Edit - Learning Guide

## 🎓 What You'll Learn

This guide teaches you how to build an **edit form** in Astro with:
- Dynamic routing with URL parameters
- Server-side data fetching (SSR)
- Form pre-population with existing data
- Smart auto-generation that respects manual edits
- Handling different input types (text, numbers, checkboxes, selects, textareas)
- Array-to-string conversions for form display
- PUT requests for updates

---

## 📚 Concepts Covered

### 1. Dynamic Routes in Astro

**File Structure**:
```
src/pages/admin/courses/[id]/edit.astro
```

**Pattern**: `[id]` is a URL parameter that Astro extracts automatically.

**Accessing the Parameter**:
```typescript
const { id } = Astro.params;
```

**Example URLs**:
- `/admin/courses/123/edit` → `id = "123"`
- `/admin/courses/abc-def/edit` → `id = "abc-def"`

**Why Use This?**  
Creates clean, RESTful URLs without query parameters.

---

### 2. Server-Side Rendering (SSR) with Data Fetching

**Enable SSR**:
```typescript
export const prerender = false;
```

**Fetch Data During SSR**:
```typescript
const { id } = Astro.params;
const course = await getCourseById(id);
```

**Benefits**:
- Data available immediately on page load
- No loading spinners needed
- SEO-friendly (if needed)
- Simpler error handling

**Error Handling**:
```typescript
try {
  const course = await getCourseById(id);
} catch (error) {
  return Astro.redirect('/admin/courses?error=course_not_found');
}
```

---

### 3. Form Pre-Population

Different input types require different pre-population methods:

#### Text Inputs
```astro
<input 
  type="text" 
  value={course.title} 
/>
```

#### Number Inputs
```astro
<input 
  type="number" 
  value={course.price} 
/>
```

#### Textareas
⚠️ **Don't use `value` attribute!**
```astro
<textarea>{course.description}</textarea>
```

#### Checkboxes
```astro
<input 
  type="checkbox" 
  checked={course.isPublished} 
/>
```

#### Select Dropdowns
```astro
<select>
  {levels.map(level => (
    <option 
      value={level} 
      selected={course.level === level}
    >
      {level}
    </option>
  ))}
</select>
```

---

### 4. Handling Arrays in Forms

**Problem**: Database stores arrays, but forms use strings.

#### Tags (Comma-Separated)

**Display**:
```astro
<input 
  value={course.tags ? course.tags.join(', ') : ''} 
/>
```

**Parse on Submit**:
```typescript
tags: formData.get('tags')?.split(',')
  .map(tag => tag.trim())
  .filter(Boolean) || []
```

#### Multi-Line Text (Prerequisites, Outcomes)

**Display**:
```astro
<textarea>{course.learningOutcomes?.join('\n') || ''}</textarea>
```

**Parse on Submit**:
```typescript
learningOutcomes: formData.get('learningOutcomes')
  ?.split('\n')
  .map(item => item.trim())
  .filter(Boolean) || []
```

---

### 5. Smart Auto-Generation (Slug Example)

**Problem**: Auto-generate slug from title, but don't overwrite manual edits.

**Solution**: Track if slug looks auto-generated.

```javascript
titleInput.addEventListener('input', () => {
  const currentSlug = slugInput.value;
  const autoSlug = generateSlug(titleInput.value);
  const previousAutoSlug = generateSlug(titleInput.dataset.previousValue || '');
  
  // Only update if slug hasn't been manually edited
  if (!currentSlug || currentSlug === previousAutoSlug) {
    slugInput.value = autoSlug;
  }
  
  titleInput.dataset.previousValue = titleInput.value;
});
```

**Logic**:
1. Generate what the slug *should* be based on current title
2. Check if current slug matches what it *would have been* from previous title
3. If yes, update it (user hasn't manually edited)
4. If no, leave it alone (user made manual changes)

---

### 6. PUT Requests vs POST Requests

#### POST (Create)
```javascript
fetch('/api/courses', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

#### PUT (Update)
```javascript
fetch(`/api/courses/${courseId}`, {
  method: 'PUT',
  body: JSON.stringify(data)
})
```

**Key Differences**:
- PUT includes ID in URL path
- PUT typically sends full object (or partial updates)
- POST creates new resource, PUT updates existing

---

### 7. Form Validation Pattern

**Client-Side Validation**:
```typescript
const requiredFields = form.querySelectorAll('[required]');
let isValid = true;
let firstInvalidField: HTMLElement | null = null;

requiredFields.forEach((field) => {
  const input = field as HTMLInputElement;
  if (!input.value.trim()) {
    input.setAttribute('aria-invalid', 'true');
    input.classList.add('border-red-500');
    isValid = false;
    if (!firstInvalidField) {
      firstInvalidField = input;
    }
  } else {
    input.removeAttribute('aria-invalid');
    input.classList.remove('border-red-500');
  }
});

if (!isValid && firstInvalidField) {
  firstInvalidField.focus();
  toast.error('Please fill in all required fields');
  return;
}
```

**Pattern Explained**:
1. Find all required fields
2. Loop through and check each one
3. Track first invalid field for focus
4. Add visual indicators (red border, aria-invalid)
5. Show error message
6. Focus first problem field

---

### 8. Toast Notifications

**Import**:
```typescript
import { useToast } from '@/lib/toast';
const toast = useToast();
```

**Usage**:
```typescript
// Success
toast.success('Course updated successfully');

// Error
toast.error('Failed to update course');

// Info
toast.info('Saving changes...');
```

**Auto-Redirect After Success**:
```typescript
toast.success('Course updated successfully');
setTimeout(() => {
  window.location.href = '/admin/courses';
}, 1000);
```

---

## 🔨 Step-by-Step Implementation

### Step 1: Create Dynamic Route

```
src/pages/admin/courses/[id]/edit.astro
```

### Step 2: Add Authentication

```typescript
const session = await getSessionFromRequest(Astro.cookies);
if (!session) {
  return Astro.redirect('/login?redirect=' + encodeURIComponent(Astro.url.pathname));
}
```

### Step 3: Fetch Course Data

```typescript
const { id } = Astro.params;
if (!id) {
  return Astro.redirect('/admin/courses');
}

let course;
try {
  course = await getCourseById(id);
} catch (error) {
  return Astro.redirect('/admin/courses?error=course_not_found');
}
```

### Step 4: Build Form with Pre-Populated Values

```astro
<input 
  type="text" 
  name="title" 
  value={course.title} 
  required 
/>

<textarea name="description" required>
  {course.description}
</textarea>

<input 
  type="checkbox" 
  name="isPublished" 
  checked={course.isPublished} 
/>
```

### Step 5: Add Client-Side JavaScript

```typescript
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('courseForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate
    // Parse form data
    // Send PUT request
    // Handle response
  });
});
```

### Step 6: Submit PUT Request

```typescript
const courseId = form.dataset.courseId;

const response = await fetch(`/api/courses/${courseId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer session'
  },
  body: JSON.stringify(data)
});

if (!response.ok) {
  throw new Error('Failed to update');
}

toast.success('Updated successfully');
window.location.href = '/admin/courses';
```

---

## 🎯 Common Patterns

### Pattern 1: Conditional Rendering

```astro
{course.imageUrl && (
  <img src={course.imageUrl} alt={course.title} />
)}
```

### Pattern 2: Fallback Values

```astro
<input value={course.thumbnailUrl || ''} />
<textarea>{course.longDescription || ''}</textarea>
```

### Pattern 3: Conditional Classes

```astro
<button 
  class={`btn ${course.isPublished ? 'btn-success' : 'btn-warning'}`}
>
  {course.isPublished ? 'Published' : 'Draft'}
</button>
```

### Pattern 4: Loop with Selection

```astro
{levels.map(level => (
  <option 
    value={level} 
    selected={course.level === level}
  >
    {formatLevel(level)}
  </option>
))}
```

---

## ⚠️ Common Mistakes

### Mistake 1: Using `value` on Textarea

❌ **Wrong**:
```astro
<textarea value={text}></textarea>
```

✅ **Correct**:
```astro
<textarea>{text}</textarea>
```

### Mistake 2: Not Handling Empty Arrays

❌ **Wrong**:
```astro
<input value={course.tags.join(', ')} />
```
*Crashes if `tags` is null/undefined!*

✅ **Correct**:
```astro
<input value={course.tags ? course.tags.join(', ') : ''} />
```

### Mistake 3: Checkbox `value` Instead of `checked`

❌ **Wrong**:
```astro
<input type="checkbox" value={course.isPublished} />
```

✅ **Correct**:
```astro
<input type="checkbox" checked={course.isPublished} />
```

### Mistake 4: Not Trimming User Input

❌ **Wrong**:
```typescript
tags: formData.get('tags')?.split(',') || []
```

✅ **Correct**:
```typescript
tags: formData.get('tags')?.split(',')
  .map(tag => tag.trim())
  .filter(Boolean) || []
```

### Mistake 5: Forgetting to Prevent Default

❌ **Wrong**:
```typescript
form.addEventListener('submit', async () => {
  // Send request
});
```
*Form submits normally, causing page refresh!*

✅ **Correct**:
```typescript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Send request
});
```

---

## 🧪 Testing Considerations

### Test Cases to Cover

1. **Happy Path**: Load → Edit → Save → Success
2. **Validation**: Submit empty form → Show errors
3. **Navigation**: Cancel button works
4. **Not Found**: Non-existent ID redirects gracefully
5. **Pre-Population**: All fields show correct data
6. **Checkboxes**: Preserve true/false states
7. **Arrays**: Tags and outcomes display correctly

### Example Test

```typescript
test('should update course successfully', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/courses');
  
  // Click edit button
  await page.click('a[href$="/edit"]');
  
  // Update title
  await page.fill('#title', 'Updated Title');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verify success
  await expect(page).toHaveURL('/admin/courses');
  await expect(page.locator('text=Updated Title')).toBeVisible();
});
```

---

## 📖 Related Topics

- [T067: Create Course Form](./T067_Admin_Course_Creation_Guide.md) - Similar form structure
- [Astro Dynamic Routes](https://docs.astro.build/en/core-concepts/routing/#dynamic-routes)
- [Astro SSR](https://docs.astro.build/en/guides/server-side-rendering/)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

## 🎓 Practice Exercises

### Exercise 1: Add "Save & Continue Editing" Button

Add a button that saves changes but stays on the edit page instead of redirecting.

**Hint**: Add a flag to track which button was clicked.

### Exercise 2: Unsaved Changes Warning

Alert user if they try to leave with unsaved changes.

**Hint**: Track form dirty state and use `beforeunload` event.

### Exercise 3: Auto-Save Drafts

Automatically save form every 30 seconds.

**Hint**: Use `setInterval` and debounce.

### Exercise 4: Field-Level Validation

Show validation errors immediately as user types.

**Hint**: Add `input` event listeners with debounce.

### Exercise 5: Preview Mode

Add a "Preview" button that shows formatted course page.

**Hint**: Open new tab with `/courses/:id?preview=true`.

---

## 💡 Key Takeaways

1. **SSR + Dynamic Routes** = Clean URLs + Fast Data Loading
2. **Different inputs require different pre-population methods**
3. **Arrays need conversion to/from strings for form display**
4. **Smart auto-generation respects manual edits**
5. **Client-side validation improves UX**
6. **PUT requests update existing resources**
7. **Toast notifications provide user feedback**
8. **Graceful error handling prevents broken experiences**

---

## 🚀 Next Steps

- **T069**: Implement remaining CRUD API endpoints
- **T070**: Add file upload for images
- **T071**: Build orders management interface
- **Advanced**: Add rich text editor for descriptions
- **Advanced**: Implement drag-and-drop curriculum builder

---

**Remember**: Edit forms are similar to create forms, but require careful attention to data pre-population and update vs create semantics. Master these patterns and you can build any CRUD interface!
