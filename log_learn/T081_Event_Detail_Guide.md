# T081: Event Detail Page - Learning Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Dynamic Routing in Astro](#dynamic-routing-in-astro)
3. [Supporting Multiple Identifier Types](#supporting-multiple-identifier-types)
4. [Map Integration Strategies](#map-integration-strategies)
5. [Visual Status Indicators](#visual-status-indicators)
6. [Sticky Sidebar Pattern](#sticky-sidebar-pattern)
7. [SEO with Schema.org](#seo-with-schemaorg)
8. [Error Handling & Redirects](#error-handling--redirects)
9. [Responsive Design Patterns](#responsive-design-patterns)
10. [Real-World Usage](#real-world-usage)

---

## Introduction

This guide teaches you how to build production-ready detail pages in Astro with map integration, visual indicators, and comprehensive SEO. We'll explore the patterns used in the event detail page implementation with practical examples you can apply to any detail view (product pages, profiles, listings, etc.).

**What You'll Learn:**
- Dynamic routing with multiple identifier types
- Embedding maps without client-side JavaScript
- Creating urgency with visual capacity indicators
- Implementing sticky sidebars for better conversion
- Adding rich structured data for SEO
- Handling errors gracefully with redirects

---

## Dynamic Routing in Astro

### The Bracket Notation

Astro uses file-based routing with brackets for dynamic segments:

```
src/pages/events/[id].astro  → /events/:id
src/pages/users/[username].astro → /users/:username
src/pages/blog/[...slug].astro → /blog/* (rest parameters)
```

### Accessing Route Parameters

```astro
---
// Get parameters from URL
const { id } = Astro.params;
const { username } = Astro.params;
const { slug } = Astro.params;

// Example URLs:
// /events/meditation-workshop → id = "meditation-workshop"
// /users/john-doe → username = "john-doe"
// /blog/2024/10/post → slug = "2024/10/post"
---
```

### Parameter Validation

Always validate parameters before using them:

```typescript
const { id } = Astro.params;

if (!id) {
  return Astro.redirect('/404');
}

// Additional validation
if (id.length > 100) {
  return Astro.redirect('/404');
}
```

### Event Detail Page Example

```astro
---
import { getEventById } from '@/lib/events';
import { NotFoundError } from '@/lib/errors';

const { id } = Astro.params;

if (!id) {
  return Astro.redirect('/events');
}

let event;
try {
  event = await getEventById(id);
} catch (error) {
  if (error instanceof NotFoundError) {
    return Astro.redirect('/404');
  }
  throw error;
}
---

<h1>{event.title}</h1>
```

---

## Supporting Multiple Identifier Types

### Why Support Both UUID and Slug?

**Benefits:**
- **UUIDs**: Guaranteed uniqueness, never conflict
- **Slugs**: SEO-friendly, human-readable, shareable

**Example:**
```
UUID: /events/550e8400-e29b-41d4-a716-446655440000
Slug: /events/meditation-workshop-london-2024
```

### Implementation Pattern

#### Service Layer (Database)

```typescript
export async function getEventById(identifier: string): Promise<Event> {
  // Detect identifier type
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  
  const queryText = `
    SELECT * FROM events
    WHERE ${isUUID ? 'id' : 'slug'} = $1
  `;
  
  const result = await query<Event>(queryText, [identifier]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Event');
  }
  
  return result.rows[0];
}
```

#### Page Layer (Astro)

```astro
---
const { id } = Astro.params;
const event = await getEventById(id); // Handles both types automatically
---
```

### UUID Detection Pattern

```typescript
// Strict UUID v4 validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(str: string): boolean {
  return uuidRegex.test(str);
}

// Usage
if (isUUID(identifier)) {
  // Query by ID
} else {
  // Query by slug
}
```

### Slug Generation Best Practices

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .trim();
}

// Examples
generateSlug('Meditation Workshop!') // → 'meditation-workshop'
generateSlug('Yoga in the Park   ') // → 'yoga-in-the-park'
```

---

## Map Integration Strategies

### Google Maps Embed API

**Pros:**
- No JavaScript required (works in static sites)
- Simple iframe implementation
- No client-side bundle size
- Official Google solution

**Cons:**
- Requires API key
- Limited customization
- Not free at high volume

#### Basic Implementation

```astro
---
const hasCoordinates = event.venue_lat && event.venue_lng;
const lat = parseFloat(event.venue_lat);
const lng = parseFloat(event.venue_lng);
---

{hasCoordinates && (
  <iframe
    src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${lat},${lng}&zoom=15`}
    width="100%"
    height="450"
    style="border:0;"
    allowfullscreen=""
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
  />
)}
```

#### With Marker and Custom Zoom

```astro
<iframe
  src={`https://www.google.com/maps/embed/v1/place?key=API_KEY&q=${lat},${lng}&zoom=14&maptype=roadmap`}
  title={`Map showing ${event.venue_name}`}
/>
```

### Fallback to Address Search

When coordinates are missing:

```typescript
const googleMapsUrl = hasCoordinates
  ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
```

### Alternative: Static Map Image

For better performance or to avoid API costs:

```astro
<a href={googleMapsUrl} target="_blank">
  <img
    src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&markers=${lat},${lng}&key=API_KEY`}
    alt="Venue location map"
  />
</a>
```

### OpenStreetMap Alternative

Free and open-source:

```astro
<iframe
  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`}
  width="100%"
  height="450"
  style="border:0;"
/>
```

### Coordinate Validation

Always validate coordinates before using:

```typescript
function hasValidCoordinates(lat?: string | number, lng?: string | number): boolean {
  if (!lat || !lng) return false;
  
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  
  return !isNaN(latNum) && !isNaN(lngNum) &&
         latNum >= -90 && latNum <= 90 &&
         lngNum >= -180 && lngNum <= 180;
}
```

---

## Visual Status Indicators

### The Three-Tier System

**Pattern:** Available → Limited → Sold Out

```typescript
function getCapacityStatus(available: number, capacity: number) {
  const percentage = (available / capacity) * 100;
  const isSoldOut = available === 0;
  const isLimited = percentage <= 20 && !isSoldOut;
  
  return {
    percentage,
    isSoldOut,
    isLimited,
    status: isSoldOut ? 'sold-out' : isLimited ? 'limited' : 'available'
  };
}
```

### Progress Bar Implementation

```astro
---
const filled = capacity - available;
const filledPercentage = (filled / capacity) * 100;
---

<div class="capacity-bar">
  <div class="capacity-progress">
    <div 
      class:list={[
        'progress-fill',
        isSoldOut ? 'bg-error' : isLimited ? 'bg-warning' : 'bg-success'
      ]}
      style={`width: ${filledPercentage}%`}
    />
  </div>
  <div class="capacity-text">
    {available} of {capacity} spots available
  </div>
</div>

<style>
  .capacity-bar {
    width: 100%;
  }
  
  .capacity-progress {
    height: 8px;
    background: var(--color-background);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
</style>
```

### Alert Banners

Show urgency messages:

```astro
{isSoldOut && (
  <div class="alert alert-error">
    <span class="alert-icon">⚠️</span>
    <div>
      <div class="alert-title">This event is sold out</div>
      <div class="alert-message">
        All spots have been filled. Check back for future events.
      </div>
    </div>
  </div>
)}

{isLimited && (
  <div class="alert alert-warning">
    <span class="alert-icon">🔥</span>
    <div>
      <div class="alert-title">Limited spots remaining</div>
      <div class="alert-message">
        Only {available} of {capacity} spots left!
      </div>
    </div>
  </div>
)}
```

### Color Psychology

Choose colors that communicate status clearly:

```css
:root {
  --color-success: #10b981;  /* Green - Available */
  --color-warning: #f59e0b;  /* Orange - Limited */
  --color-error: #ef4444;    /* Red - Sold Out */
}
```

---

## Sticky Sidebar Pattern

### Why Sticky Sidebars?

**Benefits:**
- Keeps CTA visible while scrolling
- Improves conversion rates
- Better user experience
- No JavaScript required

### Basic Implementation

```astro
<div class="grid grid-cols-3 gap-xl">
  <!-- Main Content -->
  <div class="col-span-2">
    <h1>Event Title</h1>
    <p>Long description...</p>
    <p>More content...</p>
  </div>
  
  <!-- Sticky Sidebar -->
  <aside class="col-span-1">
    <div class="sticky top-lg">
      <div class="booking-card">
        <div class="price">$25.00</div>
        <button>Book Now</button>
      </div>
    </div>
  </aside>
</div>

<style>
  .sticky {
    position: sticky;
    top: 1rem; /* Offset from top when stuck */
  }
</style>
```

### Responsive Behavior

Disable sticky on mobile:

```css
@media (max-width: 1024px) {
  .sticky {
    position: static; /* Disable sticky on mobile */
  }
}
```

Or reorder for mobile:

```astro
<div class="grid lg:grid-cols-3">
  <!-- On mobile, sidebar appears first -->
  <aside class="lg:col-span-1 lg:order-2">
    <div class="lg:sticky lg:top-lg">
      <!-- Booking card -->
    </div>
  </aside>
  
  <!-- Main content appears second on mobile -->
  <div class="lg:col-span-2 lg:order-1">
    <!-- Event details -->
  </div>
</div>
```

### Sticky Offset Considerations

Account for fixed headers:

```css
.sticky {
  position: sticky;
  top: calc(var(--header-height) + 1rem);
}
```

### Browser Support

Sticky positioning is widely supported:
- Chrome 56+
- Firefox 59+
- Safari 13+
- Edge 16+

---

## SEO with Schema.org

### What is Schema.org?

**Schema.org** provides structured data vocabulary for search engines. It helps them understand page content and display rich snippets.

### Event Schema Implementation

```astro
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.title,
  "description": event.description,
  "startDate": event.event_date.toISOString(),
  "endDate": endTime.toISOString(),
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": event.venue_name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": event.venue_address,
      "addressLocality": event.venue_city,
      "addressCountry": event.venue_country
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": lat,
      "longitude": lng
    }
  },
  "image": event.image_url,
  "organizer": {
    "@type": "Organization",
    "name": "Your Organization"
  },
  "offers": {
    "@type": "Offer",
    "price": event.price,
    "priceCurrency": "USD",
    "availability": isSoldOut 
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock",
    "url": `${Astro.site}/events/${event.slug}`
  }
})} />
```

### Benefits of Schema Markup

1. **Rich Snippets**: Enhanced search results with images, dates, prices
2. **Event Discovery**: Appears in Google's event search features
3. **Voice Assistants**: Better understanding for Alexa, Google Assistant
4. **Click-Through Rate**: Rich snippets get more clicks

### Testing Schema Markup

Use Google's Rich Results Test:
```
https://search.google.com/test/rich-results
```

### Product Schema Example

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": "https://example.com/image.jpg",
  "description": "Product description",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "127"
  }
}
```

---

## Error Handling & Redirects

### Graceful Error Handling Pattern

```astro
---
const { id } = Astro.params;

// 1. Validate input
if (!id) {
  return Astro.redirect('/events');
}

// 2. Fetch data with error handling
let event;
try {
  event = await getEventById(id);
} catch (error) {
  // 3. Handle known errors
  if (error instanceof NotFoundError) {
    return Astro.redirect('/404');
  }
  
  if (error instanceof ValidationError) {
    return Astro.redirect('/events?error=invalid');
  }
  
  // 4. Let unexpected errors bubble up
  throw error;
}

// 5. Business logic checks
if (!event.is_published && !isAdmin) {
  return Astro.redirect('/404');
}
---
```

### Redirect Strategies

#### 1. **Not Found** → 404 Page
```typescript
if (!found) {
  return Astro.redirect('/404');
}
```

#### 2. **Unauthorized** → Login
```typescript
if (!isAuthenticated) {
  return Astro.redirect(`/login?redirect=${Astro.url.pathname}`);
}
```

#### 3. **Invalid State** → List Page
```typescript
if (!valid) {
  return Astro.redirect('/events?error=invalid');
}
```

#### 4. **Canonical URL** → Preferred Format
```typescript
// Redirect UUID to slug
if (isUUID(id) && event.slug) {
  return Astro.redirect(`/events/${event.slug}`, 301);
}
```

### Custom Error Pages

Create `src/pages/404.astro`:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---

<BaseLayout title="Page Not Found">
  <div class="error-page">
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Go Home</a>
  </div>
</BaseLayout>
```

---

## Responsive Design Patterns

### Mobile-First Grid

```astro
<div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
  <!-- Stacks on mobile, 3 columns on desktop -->
</div>
```

### Responsive Typography

```css
h1 {
  font-size: 2rem; /* Mobile */
}

@media (min-width: 768px) {
  h1 {
    font-size: 3rem; /* Tablet */
  }
}

@media (min-width: 1024px) {
  h1 {
    font-size: 4rem; /* Desktop */
  }
}
```

Using Tailwind:
```astro
<h1 class="text-2xl md:text-3xl lg:text-4xl">
  Event Title
</h1>
```

### Responsive Images

```astro
<img
  src={event.image_url}
  alt={event.title}
  class="w-full aspect-video object-cover"
  loading="lazy"
/>
```

### Responsive Sidebar

```astro
<div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr]">
  <!-- Main content: Full width on mobile, 2/3 on desktop -->
  <div>Content</div>
  
  <!-- Sidebar: Full width on mobile, 1/3 on desktop -->
  <aside>Booking</aside>
</div>
```

---

## Real-World Usage

### Common Patterns

#### 1. **Product Detail Page**
```astro
---
const { id } = Astro.params;
const product = await getProductById(id);
---

<BaseLayout title={product.name}>
  <ProductGallery images={product.images} />
  <ProductInfo product={product} />
  <ProductReviews productId={product.id} />
  
  <aside>
    <AddToCartButton product={product} />
  </aside>
</BaseLayout>
```

#### 2. **User Profile Page**
```astro
---
const { username } = Astro.params;
const user = await getUserByUsername(username);
---

<ProfileHeader user={user} />
<ProfileStats user={user} />
<ProfileActivity userId={user.id} />
```

#### 3. **Article/Blog Post**
```astro
---
const { slug } = Astro.params;
const post = await getPostBySlug(slug);
---

<article>
  <h1>{post.title}</h1>
  <time datetime={post.publishedAt}>
    {formatDate(post.publishedAt)}
  </time>
  <div set:html={post.content} />
</article>
```

### Performance Tips

1. **Image Optimization**
   ```astro
   <img
     src={optimizeImage(event.image_url, { width: 1200 })}
     loading="lazy"
     decoding="async"
   />
   ```

2. **Font Loading**
   ```html
   <link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
   ```

3. **Critical CSS**
   ```astro
   <style is:inline>
     /* Inline critical styles */
   </style>
   ```

4. **Lazy Components**
   ```astro
   <LazyComponent client:visible>
     <ExpensiveComponent />
   </LazyComponent>
   ```

---

## Conclusion

This guide covered essential patterns for building detail pages:

✅ **Dynamic routing** with parameter validation  
✅ **Multi-identifier support** (UUID + slug)  
✅ **Map integration** without JavaScript  
✅ **Visual status indicators** for urgency  
✅ **Sticky sidebars** for better conversion  
✅ **Schema.org** for rich SEO  
✅ **Error handling** with graceful redirects  
✅ **Responsive design** for all devices  

These patterns are applicable to any detail page in your application—products, profiles, articles, properties, etc.

**Next Steps:**
- Apply these patterns to other entity detail pages
- Add real-time updates with WebSocket or polling
- Implement A/B testing for conversion optimization
- Add social proof elements (reviews, testimonials)
- Create shareable dynamic social cards (OG images)
