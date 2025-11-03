# T082: Interactive Book Now Button - Learning Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Button vs Link Semantics](#button-vs-link-semantics)
3. [HTML5 Data Attributes](#html5-data-attributes)
4. [Client-Side Validation](#client-side-validation)
5. [Loading States & Feedback](#loading-states--feedback)
6. [Error Handling Patterns](#error-handling-patterns)
7. [CSS Animations](#css-animations)
8. [TypeScript in Script Tags](#typescript-in-script-tags)
9. [Accessibility Best Practices](#accessibility-best-practices)
10. [Real-World Applications](#real-world-applications)

---

## Introduction

This guide teaches you how to build interactive booking buttons with capacity validation, loading states, and user feedback. These patterns apply to any action that requires validation before proceeding—booking seats, adding items to cart, submitting forms, or initiating payments.

**What You'll Learn:**
- When to use buttons vs. links
- Passing server data to client-side JavaScript
- Implementing loading states
- Creating toast notifications
- CSS animations without JavaScript
- Type-safe data handling
- Accessibility considerations

---

## Button vs Link Semantics

### The Fundamental Rule

**Links** (`<a>`) are for navigation:
```html
<!-- Good: Navigating to another page -->
<a href="/about">About Us</a>
<a href="/events">View Events</a>
```

**Buttons** (`<button>`) are for actions:
```html
<!-- Good: Triggering an action -->
<button onclick="submitForm()">Submit</button>
<button onclick="addToCart()">Add to Cart</button>
```

### Why It Matters

**Semantic Benefits**:
- Screen readers announce them differently
- Keyboard users expect different behavior
- Search engines treat them differently
- Browsers apply appropriate default styles

**Functional Benefits**:
- Buttons can be disabled
- Buttons don't navigate during processing
- Buttons work better with forms
- Buttons support loading states

### The Booking Button Case Study

**❌ Wrong Approach** (Simple Link):
```astro
<a href={`/events/${event.slug}/book`}>
  Book Now
</a>
```

**Problems**:
- Can't show loading state
- Can't disable during processing
- Can't prevent navigation if validation fails
- No way to handle errors gracefully

**✅ Correct Approach** (Interactive Button):
```astro
<button
  id="book-now-btn"
  data-event-id={event.id}
  data-available-spots={event.available_spots}
>
  Book Now
</button>

<script>
  document.getElementById('book-now-btn')
    ?.addEventListener('click', handleBooking);
</script>
```

**Benefits**:
- Can validate before proceeding
- Can show loading indicator
- Can display errors inline
- Better UX control

### When to Use Each

**Use Links When**:
- Navigating to another page
- Opening external resources
- SEO is important
- No validation needed
- Bookmarkable destination

**Use Buttons When**:
- Submitting forms
- Triggering actions
- Need validation
- Need loading states
- Need disabled states

---

## HTML5 Data Attributes

### What Are Data Attributes?

Custom attributes that store data on HTML elements, accessible from JavaScript.

**Syntax**:
```html
<element data-attribute-name="value">
```

### Why Use Data Attributes?

1. **Clean Separation**: Data separate from behavior
2. **Type Safety**: Can parse to correct types
3. **No Global Variables**: Data scoped to element
4. **Standard Approach**: Part of HTML5 spec
5. **Framework Friendly**: Works with all frameworks

### Basic Example

**HTML**:
```html
<button
  data-user-id="123"
  data-user-name="John"
  data-is-premium="true"
>
  View Profile
</button>
```

**JavaScript**:
```javascript
const button = document.querySelector('button');
const userId = button.dataset.userId;        // "123"
const userName = button.dataset.userName;    // "John"
const isPremium = button.dataset.isPremium;  // "true" (string!)
```

**Note**: JavaScript converts `data-user-id` to `dataset.userId` (camelCase).

### Type-Safe Parsing

Data attributes are always strings. Parse them correctly:

```typescript
interface UserData {
  userId: string;
  age: number;
  isPremium: boolean;
}

function parseUserData(dataset: DOMStringMap): UserData {
  return {
    userId: dataset.userId || '',
    age: parseInt(dataset.age || '0'),
    isPremium: dataset.isPremium === 'true'
  };
}
```

### Booking Button Example

**Astro Component**:
```astro
<button
  data-event-id={event.id}
  data-event-slug={event.slug}
  data-available-spots={event.available_spots}
  data-capacity={event.capacity}
  data-price={event.price}
>
  Book Now
</button>
```

**TypeScript Parsing**:
```typescript
interface BookingData {
  eventId: string;
  eventSlug: string;
  availableSpots: number;
  capacity: number;
  price: number;
}

function parseBookingData(button: HTMLButtonElement): BookingData {
  return {
    eventId: button.dataset.eventId!,
    eventSlug: button.dataset.eventSlug!,
    availableSpots: parseInt(button.dataset.availableSpots || '0'),
    capacity: parseInt(button.dataset.capacity || '0'),
    price: parseFloat(button.dataset.price || '0')
  };
}
```

### Best Practices

1. **Use Descriptive Names**
   ```html
   <!-- Good -->
   <button data-event-id="123" data-available-spots="50">
   
   <!-- Bad -->
   <button data-id="123" data-spots="50">
   ```

2. **Parse Immediately**
   ```typescript
   // Parse once, use typed data
   const data = parseBookingData(button);
   if (data.availableSpots > 0) {
     // Use data.availableSpots (number)
   }
   ```

3. **Handle Missing Data**
   ```typescript
   const id = button.dataset.eventId || 'default-id';
   const spots = parseInt(button.dataset.spots || '0');
   ```

4. **Don't Store Sensitive Data**
   ```html
   <!-- Never do this -->
   <button data-credit-card="1234-5678-9012-3456">
   
   <!-- Use tokens or IDs instead -->
   <button data-payment-token="tok_abc123">
   ```

---

## Client-Side Validation

### The Golden Rule

**Client-side validation is for UX, not security.**

```typescript
// This prevents bad UX
if (availableSpots === 0) {
  showError('Event is sold out');
  return; // Don't proceed
}

// But server MUST also validate
// Server can't trust client!
```

### Why Validate Client-Side?

1. **Immediate Feedback**: No network round-trip
2. **Reduced Server Load**: Filter invalid requests
3. **Better UX**: Instant error messages
4. **Bandwidth Savings**: Avoid unnecessary requests

### Why It's Not Security

1. **User Can Modify**: Browser dev tools can change anything
2. **Requests Can Be Forged**: cURL, Postman, etc.
3. **JavaScript Can Be Disabled**: Some users disable JS
4. **Race Conditions**: Data can change between check and action

### The Two-Layer Approach

**Layer 1: Client-Side (UX)**
```typescript
function validateBooking(spots: number): boolean {
  if (spots === 0) {
    showError('Event is sold out');
    return false;
  }
  return true;
}

// Quick feedback, no server call
if (!validateBooking(availableSpots)) {
  return; // Stop here
}
```

**Layer 2: Server-Side (Security)**
```typescript
// Server endpoint
async function POST({ request }) {
  const { eventId, quantity } = await request.json();
  
  // ALWAYS validate server-side
  const event = await getEvent(eventId);
  
  if (event.availableSpots < quantity) {
    return new Response(
      JSON.stringify({ error: 'Insufficient capacity' }),
      { status: 400 }
    );
  }
  
  // Proceed with booking...
}
```

### Validation Patterns

#### Simple Presence Check
```typescript
function validateRequired(value: string): boolean {
  return value.trim().length > 0;
}
```

#### Numeric Range
```typescript
function validateQuantity(qty: number, max: number): boolean {
  return qty > 0 && qty <= max;
}
```

#### Format Validation
```typescript
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

#### Cross-Field Validation
```typescript
function validateBookingDates(start: Date, end: Date): boolean {
  return end > start;
}
```

---

## Loading States & Feedback

### Why Loading States Matter

Users need to know:
1. Their action was received
2. Something is happening
3. How long to wait
4. If it succeeded or failed

### The Loading State Pattern

**Three States**:
1. **Idle**: Ready for interaction
2. **Loading**: Processing action
3. **Complete**: Success or error

### Basic Implementation

```typescript
async function handleAction(button: HTMLButtonElement) {
  // 1. Enter loading state
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Loading...';
  
  try {
    // 2. Perform action
    await someAsyncOperation();
    
    // 3. Success state
    button.textContent = 'Success!';
    setTimeout(() => {
      // Navigate or reset
    }, 1000);
  } catch (error) {
    // 4. Error state
    button.textContent = originalText;
    button.disabled = false;
    showError('Action failed');
  }
}
```

### Visual Loading Indicators

#### Spinner Icon
```html
<button id="submit-btn">
  <span id="btn-text">Submit</span>
  <svg id="btn-spinner" class="hidden animate-spin">
    <!-- Spinner SVG -->
  </svg>
</button>
```

```typescript
function showLoading(button: HTMLButtonElement) {
  const text = button.querySelector('#btn-text');
  const spinner = button.querySelector('#btn-spinner');
  
  text?.classList.add('hidden');
  spinner?.classList.remove('hidden');
  button.disabled = true;
}
```

#### Text Only
```typescript
button.textContent = 'Processing...';
button.disabled = true;
```

#### Progress Bar
```html
<button id="upload-btn">Upload</button>
<div id="progress" class="hidden">
  <div class="progress-bar" style="width: 0%"></div>
</div>
```

### The Booking Button Example

```typescript
async function handleBookNow(event: Event) {
  const button = event.currentTarget as HTMLButtonElement;
  
  // Save original state
  const originalText = button.textContent;
  
  // Enter loading state
  button.disabled = true;
  button.innerHTML = `
    <span class="inline-flex items-center gap-2">
      <svg class="animate-spin h-5 w-5">...</svg>
      <span>Processing...</span>
    </span>
  `;
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Success: redirect
    window.location.href = `/events/${slug}/book`;
  } catch (error) {
    // Error: restore button
    button.disabled = false;
    button.textContent = originalText;
    showError('Booking failed');
  }
}
```

### Best Practices

1. **Always Disable During Loading**
   ```typescript
   button.disabled = true; // Prevent double-clicks
   ```

2. **Preserve Original State**
   ```typescript
   const original = button.textContent;
   // ... loading ...
   button.textContent = original; // Restore on error
   ```

3. **Show Progress When Possible**
   ```typescript
   // For uploads, downloads, etc.
   progressBar.style.width = `${percent}%`;
   ```

4. **Timeout Long Operations**
   ```typescript
   const timeout = setTimeout(() => {
     showError('Operation timed out');
     button.disabled = false;
   }, 30000); // 30 seconds
   ```

---

## Error Handling Patterns

### Toast Notifications

Non-blocking alerts that appear temporarily.

**Basic Structure**:
```html
<div class="toast toast-error">
  <div class="toast-icon">⚠️</div>
  <div class="toast-content">
    <div class="toast-title">Error</div>
    <div class="toast-message">Something went wrong</div>
  </div>
  <button class="toast-close">×</button>
</div>
```

**JavaScript Implementation**:
```typescript
function showToast(message: string, type: 'success' | 'error' = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <strong>${type === 'success' ? '✓' : '⚠️'}</strong>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => toast.remove(), 5000);
}
```

### Inline Errors

Display errors next to the relevant field or action.

```html
<button id="submit">Submit</button>
<div id="error-msg" class="error-message hidden"></div>
```

```typescript
function showInlineError(message: string) {
  const errorDiv = document.getElementById('error-msg');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }
}
```

### Modal Errors

For critical errors that require acknowledgment.

```typescript
function showErrorModal(title: string, message: string) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <p>${message}</p>
      <button onclick="this.closest('.modal').remove()">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
}
```

### Error Message Best Practices

1. **Be Specific**
   ```typescript
   // Bad
   showError('Error occurred');
   
   // Good
   showError('Event is sold out. Please try another event.');
   ```

2. **Provide Next Steps**
   ```typescript
   showError('Payment failed. Please check your card details and try again.');
   ```

3. **Use Friendly Language**
   ```typescript
   // Bad
   showError('ERR_INVALID_TOKEN_422');
   
   // Good
   showError('Your session expired. Please log in again.');
   ```

4. **Don't Expose Technical Details**
   ```typescript
   // Bad
   showError(error.stack); // Shows code details
   
   // Good
   console.error(error); // Log for debugging
   showError('Unable to complete action. Please try again.');
   ```

---

## CSS Animations

### Why CSS Over JavaScript?

1. **Performance**: Hardware-accelerated
2. **Smoothness**: 60fps easily achieved
3. **Simplicity**: Less code
4. **Battery Life**: More efficient on mobile

### Basic Spinner Animation

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

**HTML**:
```html
<svg class="spinner" width="24" height="24">
  <circle cx="12" cy="12" r="10" />
</svg>
```

### Fade In Animation

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fade-in 0.3s ease-out;
}
```

### Slide In Animation

```css
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.slide-in {
  animation: slide-in-right 0.3s ease-out;
}
```

### Loading Dots

```css
@keyframes loading-dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.loading::after {
  content: '.';
  animation: loading-dots 1.5s infinite;
}
```

**Usage**:
```html
<span class="loading">Loading</span>
<!-- Displays: "Loading..." with animated dots -->
```

### Pulse Animation

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}
```

### Animation Best Practices

1. **Use Transform & Opacity**
   ```css
   /* Fast (hardware-accelerated) */
   transform: translateX(10px);
   opacity: 0.5;
   
   /* Slow (triggers repaints) */
   left: 10px;
   width: 50%;
   ```

2. **Add will-change for Complex Animations**
   ```css
   .animated-element {
     will-change: transform, opacity;
   }
   ```

3. **Remove will-change After Animation**
   ```javascript
   element.addEventListener('animationend', () => {
     element.style.willChange = 'auto';
   });
   ```

4. **Use Appropriate Easing**
   ```css
   /* For entering */
   animation-timing-function: ease-out;
   
   /* For exiting */
   animation-timing-function: ease-in;
   
   /* For looping */
   animation-timing-function: ease-in-out;
   ```

---

## TypeScript in Script Tags

### Why TypeScript in Astro?

Astro supports TypeScript in `<script>` tags for type safety.

**Basic Example**:
```astro
<script>
  interface User {
    id: number;
    name: string;
  }
  
  const user: User = {
    id: 1,
    name: 'John'
  };
</script>
```

### Type-Safe DOM Access

```typescript
// Get element with type assertion
const button = document.getElementById('book-btn') as HTMLButtonElement;

// Null check
const button = document.getElementById('book-btn');
if (button instanceof HTMLButtonElement) {
  button.disabled = true;
}

// Optional chaining
document.getElementById('book-btn')?.addEventListener('click', handler);
```

### Type-Safe Data Parsing

```typescript
interface BookingData {
  eventId: string;
  availableSpots: number;
}

function parseBookingData(button: HTMLButtonElement): BookingData {
  const dataset = button.dataset;
  
  return {
    eventId: dataset.eventId ?? '',
    availableSpots: parseInt(dataset.availableSpots ?? '0')
  };
}
```

### Event Handler Types

```typescript
// Click event
function handleClick(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement;
}

// Form submit
function handleSubmit(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
}

// Input change
function handleChange(event: Event) {
  const input = event.target as HTMLInputElement;
  console.log(input.value);
}
```

---

## Accessibility Best Practices

### Button Accessibility

1. **Use Semantic HTML**
   ```html
   <!-- Good -->
   <button>Click Me</button>
   
   <!-- Bad -->
   <div onclick="...">Click Me</div>
   ```

2. **Provide Clear Labels**
   ```html
   <button>Book Event</button> <!-- Clear -->
   <button>Click Here</button> <!-- Vague -->
   ```

3. **Include Loading Announcements**
   ```html
   <button aria-live="polite" aria-busy="true">
     <span class="sr-only">Loading</span>
     Processing...
   </button>
   ```

4. **Announce State Changes**
   ```typescript
   // Update aria-label when state changes
   button.setAttribute('aria-label', 'Booking in progress');
   ```

### Focus Management

```typescript
// Save focus before modal
const previousFocus = document.activeElement;

// Show modal
showModal();

// Restore focus when closed
(previousFocus as HTMLElement)?.focus();
```

### Keyboard Support

All interactive elements should work with keyboard:

```typescript
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleAction();
  }
});
```

---

## Real-World Applications

### E-commerce Add to Cart

```astro
<button
  data-product-id={product.id}
  data-price={product.price}
  data-stock={product.stock}
  onclick="addToCart(this)"
>
  Add to Cart
</button>

<script>
  function addToCart(button: HTMLButtonElement) {
    const stock = parseInt(button.dataset.stock || '0');
    
    if (stock === 0) {
      showError('Out of stock');
      return;
    }
    
    // Show loading
    button.disabled = true;
    button.textContent = 'Adding...';
    
    // Add to cart...
  }
</script>
```

### Form Submission with Validation

```astro
<form id="contact-form">
  <input name="email" required />
  <button type="submit">Send</button>
</form>

<script>
  const form = document.getElementById('contact-form');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    
    button.disabled = true;
    button.textContent = 'Sending...';
    
    try {
      await submitForm(new FormData(form as HTMLFormElement));
      showSuccess('Message sent!');
    } catch (error) {
      showError('Failed to send');
      button.disabled = false;
      button.textContent = 'Send';
    }
  });
</script>
```

### File Upload with Progress

```astro
<input type="file" id="file-input" />
<button onclick="uploadFile()">Upload</button>
<div id="progress" class="hidden">
  <div class="progress-bar" style="width: 0%"></div>
</div>

<script>
  async function uploadFile() {
    const input = document.getElementById('file-input') as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    const progress = document.getElementById('progress');
    progress?.classList.remove('hidden');
    
    // Upload with progress tracking
    // Update progress bar as upload proceeds
  }
</script>
```

---

## Conclusion

This guide covered essential patterns for interactive buttons:

✅ **Semantic HTML** (button vs link)  
✅ **Data attributes** for passing data  
✅ **Client-side validation** for UX  
✅ **Loading states** for feedback  
✅ **Error handling** with toasts  
✅ **CSS animations** for performance  
✅ **TypeScript** for type safety  
✅ **Accessibility** considerations  

These patterns are fundamental to modern web development and applicable across any framework or project. Master these, and you'll build better user experiences.

**Next Steps:**
- Implement these patterns in your projects
- Add server-side validation
- Create reusable components
- Test with screen readers
- Measure performance impact
