# Form Validation & Smart Input Patterns Guide

**Learning Objective**: Master client-side form validation, auto-generation features, and smart input patterns for professional web applications.

**Skill Level**: Intermediate  
**Prerequisites**: HTML forms, JavaScript, Tailwind CSS basics  
**Related Tasks**: T066 (Admin Courses Form), T087 (Admin Events Form)

---

## Table of Contents

1. [Introduction to Form Validation](#introduction)
2. [Client-Side Validation Strategies](#validation-strategies)
3. [Auto-Generation Patterns](#auto-generation)
4. [Real-Time Validation](#realtime-validation)
5. [Visual Feedback & Error States](#visual-feedback)
6. [Smart Input Features](#smart-inputs)
7. [Data Type Conversion](#data-conversion)
8. [Accessibility in Forms](#accessibility)
9. [Testing Form Logic](#testing)
10. [Best Practices](#best-practices)

---

## 1. Introduction to Form Validation {#introduction}

### Why Validate?

**User Experience**:
- Immediate feedback prevents frustration
- Clear error messages guide correction
- Smart defaults reduce manual work

**Data Quality**:
- Prevents invalid data from reaching server
- Enforces business rules
- Maintains database integrity

**Security**:
- First line of defense against malicious input
- Prevents injection attacks
- Validates data types and formats

### Validation Layers

**3-Layer Approach**:
```
1. Browser Native Validation
   ↓ (HTML5 attributes)
2. Client-Side JavaScript
   ↓ (Custom validation logic)
3. Server-Side API
   ↓ (Final authority, security)
Database
```

**Why Multiple Layers?**
- Browser validation: Instant feedback, no code needed
- Client validation: Custom rules, better UX
- Server validation: Security, data integrity

---

## 2. Client-Side Validation Strategies {#validation-strategies}

### HTML5 Native Validation

**Built-in Attributes**:
```html
<!-- Required field -->
<input type="text" required />

<!-- Number with range -->
<input type="number" min="0" max="100" step="1" />

<!-- Email format -->
<input type="email" required />

<!-- Pattern matching -->
<input type="text" pattern="[A-Za-z0-9\-]+" />

<!-- Text length -->
<input type="text" minlength="3" maxlength="50" />
```

**Benefits**:
- Zero JavaScript required
- Browser handles UI
- Works without JS enabled

**Limitations**:
- Limited customization
- Inconsistent browser UI
- No control over error messages

### Custom JavaScript Validation

**Manual Field Check**:
```typescript
const requiredFields = form.querySelectorAll('[required]');
let isValid = true;
let firstInvalidField: HTMLElement | null = null;

requiredFields.forEach((field) => {
  const input = field as HTMLInputElement;
  
  // Check if empty
  if (!input.value.trim()) {
    // Mark as invalid
    input.setAttribute('aria-invalid', 'true');
    input.classList.add('border-red-500', 'ring-2', 'ring-red-500');
    
    isValid = false;
    
    // Track first error for focus
    if (!firstInvalidField) {
      firstInvalidField = input;
    }
  } else {
    // Mark as valid
    input.removeAttribute('aria-invalid');
    input.classList.remove('border-red-500', 'ring-2', 'ring-red-500');
  }
});

if (!isValid && firstInvalidField) {
  firstInvalidField.focus(); // Focus first error
  showToast('Please fill in all required fields');
  return false;
}
```

**Benefits**:
- Custom error styling
- Control error messages
- Focus management
- Complex validation logic

### Business Rule Validation

**Example: Capacity Check**:
```typescript
const capacity = parseInt(capacityInput.value);
const availableSpots = parseInt(availableSpotsInput.value);

if (availableSpots > capacity) {
  showError(availableSpotsInput, 'Available spots cannot exceed total capacity');
  return false;
}

if (availableSpots < 0) {
  showError(availableSpotsInput, 'Available spots cannot be negative');
  return false;
}
```

**Example: Date Range Check**:
```typescript
const startDate = new Date(startDateInput.value);
const endDate = new Date(endDateInput.value);

if (endDate < startDate) {
  showError(endDateInput, 'End date must be after start date');
  return false;
}

const now = new Date();
if (startDate < now) {
  showError(startDateInput, 'Start date must be in the future');
  return false;
}
```

**Example: Coordinate Validation**:
```typescript
function isValidLatitude(lat: number | undefined): boolean {
  if (lat === undefined) return true; // Optional
  return lat >= -90 && lat <= 90;
}

function isValidLongitude(lng: number | undefined): boolean {
  if (lng === undefined) return true; // Optional
  return lng >= -180 && lng <= 180;
}

const lat = parseFloat(latInput.value);
const lng = parseFloat(lngInput.value);

if (latInput.value && !isValidLatitude(lat)) {
  showError(latInput, 'Latitude must be between -90 and 90');
  return false;
}

if (lngInput.value && !isValidLongitude(lng)) {
  showError(lngInput, 'Longitude must be between -180 and 180');
  return false;
}
```

---

## 3. Auto-Generation Patterns {#auto-generation}

### Slug Generation from Title

**The Problem**:
Creating URL-friendly slugs manually is tedious and error-prone.

**The Solution**:
```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()                    // Convert to lowercase
    .replace(/[^a-z0-9]+/g, '-')      // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '');           // Remove leading/trailing hyphens
}
```

**Examples**:
```typescript
generateSlug('Spiritual Workshop')
// → 'spiritual-workshop'

generateSlug('Meditation & Mindfulness: A Journey!')
// → 'meditation-mindfulness-a-journey'

generateSlug('   Multiple    Spaces   ')
// → 'multiple-spaces'

generateSlug('7 Day Retreat 2024')
// → '7-day-retreat-2024'
```

**Implementation with Manual Override**:
```typescript
const titleInput = document.getElementById('title') as HTMLInputElement;
const slugInput = document.getElementById('slug') as HTMLInputElement;

// Auto-generate on title change
titleInput.addEventListener('input', () => {
  // Only auto-generate if not manually edited
  if (!slugInput.dataset.manuallyEdited) {
    slugInput.value = generateSlug(titleInput.value);
  }
});

// Track manual edits
slugInput.addEventListener('input', () => {
  slugInput.dataset.manuallyEdited = 'true';
});
```

**User Experience Flow**:
1. Admin types: "Spiritual Awakening Workshop"
2. Slug auto-fills: "spiritual-awakening-workshop"
3. Admin can edit slug if desired
4. Once edited, auto-generation stops

**Benefits**:
- Saves time (no manual slugging)
- Ensures URL-safe format
- Allows customization when needed
- Respects user intent

### Auto-Sync Related Fields

**The Problem**:
When creating an event, available spots should initially equal capacity.

**The Solution**:
```typescript
const capacityInput = document.getElementById('capacity') as HTMLInputElement;
const availableSpotsInput = document.getElementById('available_spots') as HTMLInputElement;

// Auto-sync available spots with capacity
capacityInput.addEventListener('input', () => {
  // Only sync if not manually edited
  if (!availableSpotsInput.dataset.manuallyEdited) {
    availableSpotsInput.value = capacityInput.value;
  }
});

// Track manual edits
availableSpotsInput.addEventListener('input', () => {
  availableSpotsInput.dataset.manuallyEdited = 'true';
});
```

**User Experience Flow**:
1. Admin sets capacity: 100
2. Available spots auto-updates: 100
3. Admin can override (e.g., 75 for early bookings)
4. Once overridden, auto-sync stops

**Other Use Cases**:
- Start date → End date (default +1 day)
- First name + Last name → Full name
- Street + City + Country → Full address
- Price → Discounted price (default same)

---

## 4. Real-Time Validation {#realtime-validation}

### On Blur Validation

**When to Use**: After user leaves a field

```typescript
input.addEventListener('blur', () => {
  validateField(input);
});

function validateField(input: HTMLInputElement): boolean {
  // Check if empty (required field)
  if (input.hasAttribute('required') && !input.value.trim()) {
    showError(input, 'This field is required');
    return false;
  }
  
  // Check specific validations based on type
  if (input.type === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input.value)) {
      showError(input, 'Please enter a valid email');
      return false;
    }
  }
  
  if (input.type === 'number') {
    const num = parseFloat(input.value);
    const min = input.min ? parseFloat(input.min) : -Infinity;
    const max = input.max ? parseFloat(input.max) : Infinity;
    
    if (num < min || num > max) {
      showError(input, `Value must be between ${min} and ${max}`);
      return false;
    }
  }
  
  // Valid
  clearError(input);
  return true;
}
```

### On Input Validation (Debounced)

**When to Use**: Real-time feedback for expensive operations

```typescript
let debounceTimer: number;

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    validateField(input);
  }, 300); // Wait 300ms after user stops typing
});
```

**Why Debounce?**
- Reduces validation calls
- Prevents UI flicker
- Better performance

### On Submit Validation

**Final Check Before Submission**:
```typescript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate all fields
  const allValid = Array.from(form.querySelectorAll('input, select, textarea'))
    .map(field => validateField(field as HTMLInputElement))
    .every(valid => valid === true);
  
  if (!allValid) {
    showToast('Please fix all errors before submitting');
    return;
  }
  
  // Custom business rules
  if (!validateBusinessRules()) {
    return;
  }
  
  // Submit form
  await submitForm();
});
```

---

## 5. Visual Feedback & Error States {#visual-feedback}

### Error Styling with Tailwind

**Invalid State**:
```typescript
function showError(input: HTMLInputElement, message: string): void {
  // Add error classes
  input.classList.add(
    'border-red-500',   // Red border
    'ring-2',           // Ring for emphasis
    'ring-red-500'      // Red ring color
  );
  
  // Mark as invalid for screen readers
  input.setAttribute('aria-invalid', 'true');
  
  // Create/update error message
  let errorMsg = input.parentElement?.querySelector('.error-message');
  
  if (!errorMsg) {
    errorMsg = document.createElement('p');
    errorMsg.className = 'error-message mt-1 text-sm text-red-600';
    input.parentElement?.appendChild(errorMsg);
  }
  
  errorMsg.textContent = message;
}
```

**Valid State**:
```typescript
function clearError(input: HTMLInputElement): void {
  // Remove error classes
  input.classList.remove(
    'border-red-500',
    'ring-2',
    'ring-red-500'
  );
  
  // Remove invalid marker
  input.removeAttribute('aria-invalid');
  
  // Remove error message
  const errorMsg = input.parentElement?.querySelector('.error-message');
  errorMsg?.remove();
}
```

**Optional: Success State**:
```typescript
function showSuccess(input: HTMLInputElement): void {
  input.classList.add(
    'border-green-500',
    'ring-2',
    'ring-green-500'
  );
  
  // Add checkmark icon
  const icon = document.createElement('span');
  icon.className = 'absolute right-3 top-2 text-green-600';
  icon.innerHTML = '✓';
  input.parentElement?.appendChild(icon);
}
```

### CSS for Error States

```css
/* Base input */
.input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md;
  @apply focus:ring-2 focus:ring-purple-500 focus:border-purple-500;
  transition: all 0.2s;
}

/* Error state */
.input[aria-invalid="true"] {
  @apply border-red-500 ring-2 ring-red-500;
}

/* Error message */
.error-message {
  @apply mt-1 text-sm text-red-600;
  animation: shake 0.3s;
}

/* Shake animation */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

### Toast Notifications

**Implementation**:
```typescript
import { useToast } from '@/lib/toast';

const toast = useToast();

// Error toast
toast.error('Please fill in all required fields');

// Success toast
toast.success('Event created successfully');

// Info toast
toast.info('Saving draft...');

// Warning toast
toast.warning('Some fields may need attention');
```

---

## 6. Smart Input Features {#smart-inputs}

### Currency Input with Symbol

**HTML Structure**:
```html
<div class="relative">
  <span class="absolute left-3 top-2 text-gray-500">$</span>
  <input 
    type="number" 
    step="0.01"
    class="w-full pl-7 pr-3 py-2 border rounded"
    placeholder="99.00"
  />
</div>
```

**Benefits**:
- Visual currency context
- User enters number only
- Professional appearance

### Date/Time Input

**HTML5 datetime-local**:
```html
<input 
  type="datetime-local" 
  name="event_date"
  required
  class="w-full px-3 py-2 border rounded"
/>
```

**Benefits**:
- Native date picker
- Format validation
- Timezone handling

**Custom Date Display**:
```typescript
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

// Example: "Sat, Dec 15, 2024, 6:00 PM"
```

### Multi-Line Text with Auto-Height

**Implementation**:
```typescript
const textarea = document.querySelector('textarea');

textarea.addEventListener('input', () => {
  // Reset height to auto to get correct scrollHeight
  textarea.style.height = 'auto';
  
  // Set height to scrollHeight
  textarea.style.height = textarea.scrollHeight + 'px';
});
```

**CSS**:
```css
textarea {
  min-height: 100px;
  max-height: 400px;
  overflow-y: auto;
  resize: vertical;
}
```

### Optional Fields with Contextual Help

**HTML Structure**:
```html
<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
  <div class="flex items-start gap-3">
    <!-- Info icon -->
    <svg class="w-5 h-5 text-blue-600 mt-0.5">...</svg>
    
    <div class="flex-1">
      <h3 class="text-sm font-medium text-blue-900">
        Optional: Coordinates for Map Display
      </h3>
      <p class="text-sm text-blue-700 mb-3">
        Add latitude and longitude to show venue on map
      </p>
      
      <!-- Optional inputs -->
      <div class="grid grid-cols-2 gap-4">
        <input type="number" name="lat" placeholder="37.7749" />
        <input type="number" name="lng" placeholder="-122.4194" />
      </div>
    </div>
  </div>
</div>
```

**Benefits**:
- Clear optional nature
- Explains benefit
- Visually distinct
- Doesn't clutter required fields

---

## 7. Data Type Conversion {#data-conversion}

### Form Data to API Payload

**The Challenge**:
```typescript
// Form data is always strings
formData.get('price')          // "99.99" (string)
formData.get('capacity')       // "50" (string)
formData.get('is_published')   // "on" or null

// API expects proper types
{
  price: 99.99,              // number
  capacity: 50,              // number
  is_published: true         // boolean
}
```

**The Solution**:
```typescript
interface EventFormData {
  title: string;
  price: number;
  capacity: number;
  event_date: string;        // ISO string
  venue_lat?: number;        // Optional
  is_published: boolean;
}

function formatFormData(formData: FormData): EventFormData {
  return {
    // Strings (direct)
    title: formData.get('title') as string,
    
    // Numbers (parse)
    price: parseFloat(formData.get('price') as string),
    capacity: parseInt(formData.get('capacity') as string, 10),
    
    // Dates (ISO string)
    event_date: new Date(formData.get('event_date') as string).toISOString(),
    
    // Optional numbers
    venue_lat: formData.get('venue_lat') 
      ? parseFloat(formData.get('venue_lat') as string)
      : undefined,
    
    // Checkboxes (boolean)
    is_published: formData.get('is_published') === 'on',
  };
}
```

### Type Validation

**Number Validation**:
```typescript
function validateNumber(value: string, options: {
  min?: number;
  max?: number;
  step?: number;
} = {}): number | null {
  const num = parseFloat(value);
  
  // Check if valid number
  if (isNaN(num)) {
    return null;
  }
  
  // Check min
  if (options.min !== undefined && num < options.min) {
    return null;
  }
  
  // Check max
  if (options.max !== undefined && num > options.max) {
    return null;
  }
  
  // Check step
  if (options.step !== undefined) {
    const remainder = num % options.step;
    if (remainder !== 0) {
      return null;
    }
  }
  
  return num;
}

// Usage
const price = validateNumber(priceInput.value, { min: 0, step: 0.01 });
if (price === null) {
  showError(priceInput, 'Invalid price');
}
```

**Date Validation**:
```typescript
function validateDate(dateString: string): Date | null {
  const date = new Date(dateString);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

function isFutureDate(date: Date): boolean {
  return date > new Date();
}

// Usage
const eventDate = validateDate(dateInput.value);
if (!eventDate) {
  showError(dateInput, 'Invalid date');
} else if (!isFutureDate(eventDate)) {
  showError(dateInput, 'Event date must be in the future');
}
```

---

## 8. Accessibility in Forms {#accessibility}

### Semantic HTML

**Proper Structure**:
```html
<form>
  <fieldset>
    <legend>Event Details</legend>
    
    <div>
      <label for="title">
        Event Title
        <abbr title="required" aria-label="required">*</abbr>
      </label>
      <input 
        type="text" 
        id="title"
        name="title"
        required
        aria-required="true"
        aria-describedby="title-help"
      />
      <p id="title-help" class="help-text">
        Enter a descriptive title for your event
      </p>
    </div>
  </fieldset>
</form>
```

**Key Elements**:
- `<label for="id">`: Associates label with input
- `<fieldset>` + `<legend>`: Groups related fields
- `aria-required`: Indicates required field
- `aria-describedby`: Links help text
- `aria-invalid`: Marks validation state

### ARIA Attributes for Validation

**Invalid State**:
```typescript
// Mark field as invalid
input.setAttribute('aria-invalid', 'true');
input.setAttribute('aria-describedby', `${input.id}-error`);

// Create error message
const error = document.createElement('div');
error.id = `${input.id}-error`;
error.setAttribute('role', 'alert');
error.textContent = 'This field is required';
```

**Valid State**:
```typescript
input.removeAttribute('aria-invalid');
input.removeAttribute('aria-describedby');

// Remove error message
document.getElementById(`${input.id}-error`)?.remove();
```

### Keyboard Navigation

**Focus Management**:
```typescript
// Focus first invalid field
form.addEventListener('submit', (e) => {
  const firstInvalid = form.querySelector('[aria-invalid="true"]') as HTMLElement;
  
  if (firstInvalid) {
    e.preventDefault();
    firstInvalid.focus();
  }
});
```

**Tab Order**:
```html
<!-- Use tabindex sparingly -->
<button type="button" tabindex="0">Secondary Action</button>
<button type="submit" tabindex="0">Primary Action</button>

<!-- Negative tabindex removes from tab order -->
<div tabindex="-1">Not focusable by keyboard</div>
```

### Screen Reader Announcements

**Live Regions**:
```html
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  class="sr-only"
>
  <!-- Announce validation results -->
  <span id="validation-status"></span>
</div>
```

**Update Announcements**:
```typescript
const statusRegion = document.getElementById('validation-status');

// Success
statusRegion.textContent = 'Form submitted successfully';

// Error
statusRegion.textContent = '3 errors found. Please review the form';
```

---

## 9. Testing Form Logic {#testing}

### Unit Testing Validation Functions

**Slug Generation Tests**:
```typescript
import { describe, it, expect } from 'vitest';

describe('Slug Generation', () => {
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  it('should generate slug from simple title', () => {
    expect(generateSlug('Spiritual Workshop')).toBe('spiritual-workshop');
  });

  it('should handle special characters', () => {
    expect(generateSlug('Meditation & Mindfulness!')).toBe('meditation-mindfulness');
  });

  it('should handle multiple spaces', () => {
    expect(generateSlug('Yoga    Session')).toBe('yoga-session');
  });

  it('should remove leading/trailing hyphens', () => {
    expect(generateSlug('!!!Workshop!!!')).toBe('workshop');
  });
});
```

**Validation Tests**:
```typescript
describe('Capacity Validation', () => {
  const validateCapacity = (capacity: number, available: number): boolean => {
    return available >= 0 && available <= capacity;
  };

  it('should accept valid capacity', () => {
    expect(validateCapacity(50, 50)).toBe(true);
    expect(validateCapacity(100, 75)).toBe(true);
  });

  it('should reject invalid capacity', () => {
    expect(validateCapacity(50, 75)).toBe(false);
    expect(validateCapacity(50, -5)).toBe(false);
  });
});
```

### Integration Testing

**Form Submission Test**:
```typescript
import { render, fireEvent, waitFor } from '@testing-library/dom';

describe('Event Form Submission', () => {
  it('should validate required fields', async () => {
    const form = render(`
      <form id="eventForm">
        <input type="text" name="title" required />
        <button type="submit">Submit</button>
      </form>
    `);
    
    const submitButton = form.getByRole('button');
    fireEvent.click(submitButton);
    
    // Check for validation error
    await waitFor(() => {
      const titleInput = form.getByRole('textbox');
      expect(titleInput.getAttribute('aria-invalid')).toBe('true');
    });
  });
});
```

---

## 10. Best Practices {#best-practices}

### Form Design Principles

**1. Progressive Disclosure**:
```html
<!-- Show only essential fields first -->
<div class="basic-fields">
  <input name="title" required />
  <input name="date" required />
</div>

<!-- Advanced fields in expandable section -->
<details>
  <summary>Advanced Options</summary>
  <div class="advanced-fields">
    <input name="coordinates" />
  </div>
</details>
```

**2. Logical Grouping**:
- Group related fields together
- Use visual separators (headers, borders)
- Clear section labels with icons

**3. Sensible Defaults**:
- Pre-fill common values
- Use placeholder text as examples
- Auto-sync related fields

**4. Clear Error Messages**:
```typescript
// ❌ Bad: Vague
"Invalid input"

// ✅ Good: Specific
"Price must be a positive number"

// ✅ Better: Actionable
"Please enter a price of $0.01 or more"
```

### Performance Optimization

**1. Debounce Expensive Operations**:
```typescript
let timer: number;

input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    validateAgainstAPI(input.value);
  }, 500);
});
```

**2. Lazy Load Validation**:
```typescript
// Only validate when needed
input.addEventListener('blur', () => {
  if (input.value) {
    validateField(input);
  }
});
```

**3. Batch DOM Updates**:
```typescript
// ❌ Bad: Multiple reflows
inputs.forEach(input => {
  input.classList.add('error');
});

// ✅ Good: Single reflow
const fragment = document.createDocumentFragment();
inputs.forEach(input => {
  input.classList.add('error');
  fragment.appendChild(input);
});
form.appendChild(fragment);
```

### Security Considerations

**1. Never Trust Client Validation**:
- Always validate on server
- Client validation is UX, not security
- Assume all client data is malicious

**2. Sanitize Input**:
```typescript
function sanitizeText(text: string): string {
  return text
    .trim()                          // Remove whitespace
    .replace(/\s+/g, ' ')            // Normalize spaces
    .replace(/<script>/gi, '');      // Remove script tags
}
```

**3. Use Content Security Policy**:
```html
<meta 
  http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self' 'unsafe-inline'"
/>
```

### Error Recovery

**1. Save Draft Periodically**:
```typescript
setInterval(() => {
  const formData = new FormData(form);
  localStorage.setItem('draft', JSON.stringify(Object.fromEntries(formData)));
}, 30000); // Every 30 seconds
```

**2. Restore from Draft**:
```typescript
window.addEventListener('load', () => {
  const draft = localStorage.getItem('draft');
  if (draft) {
    const data = JSON.parse(draft);
    Object.keys(data).forEach(key => {
      const input = form.elements.namedItem(key) as HTMLInputElement;
      if (input) {
        input.value = data[key];
      }
    });
  }
});
```

---

## Summary

### Key Takeaways

1. **Layered Validation**:
   - HTML5 native (instant feedback)
   - Client-side JavaScript (custom logic)
   - Server-side API (security)

2. **Auto-Generation**:
   - Slug from title
   - Auto-sync related fields
   - Smart defaults
   - Manual override support

3. **Visual Feedback**:
   - Error states with red border + ring
   - Toast notifications
   - Focus management
   - Accessibility markers

4. **Smart Features**:
   - Currency indicators
   - Date/time pickers
   - Optional field callouts
   - Auto-height textareas

5. **Type Safety**:
   - Convert form strings to proper types
   - Validate before conversion
   - Handle optional fields
   - ISO dates for API

6. **Accessibility**:
   - Semantic HTML
   - ARIA attributes
   - Keyboard navigation
   - Screen reader support

### Practice Exercises

1. **Build a registration form** with email, password, and confirmation
2. **Add slug generation** to a blog post form
3. **Implement date range validation** for booking system
4. **Create auto-complete** for address fields
5. **Add real-time password strength** indicator

---

## Related Resources

- **MDN Web Docs**: Form validation guide
- **WCAG 2.1**: Accessibility guidelines for forms
- **Tailwind CSS**: Utility classes for styling
- **Vitest**: Testing framework for validation logic
- **T066**: Admin courses form implementation
- **T087**: Admin events form with venue input

---

**Remember**: Good form validation is about helping users succeed, not catching them making mistakes. Provide clear guidance, instant feedback, and smart defaults to create a delightful user experience.
