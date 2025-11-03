# T080: EventCard Component Implementation Log

**Task**: Create src/components/EventCard.astro - Event card with date, venue, capacity indicator

**Status**: ✅ Complete

**Date**: November 1, 2025

---

## Overview

Created a reusable EventCard component for displaying event previews in listings and grids. The component provides a comprehensive view of event details with visual indicators for capacity status, sold-out events, and limited availability.

## Files Created

### 1. `src/components/EventCard.astro` (219 lines)
- **Purpose**: Reusable event card component for event catalog and listings
- **Features**:
  - Event image with hover effects and lazy loading
  - Calendar-style date badge display
  - Formatted date, time, and duration
  - Venue location with icon
  - Three-tier capacity status indicator (available, limited, sold-out)
  - Price display with "Free" support
  - Sold-out overlay badge
  - Limited spots warning badge
  - "Book Now" CTA (disabled when sold out)
  - Two layout variants: default (vertical) and compact (horizontal)
  - Fully responsive design

---

## Design Decisions

### 1. **Two Layout Variants**
**Decision**: Provide `default` and `compact` variants

**Rationale**:
- Default variant works best for grid layouts (3 columns, 2 columns, etc.)
- Compact variant optimized for list views and smaller spaces
- Compact uses horizontal layout on larger screens, vertical on mobile
- Maintains consistency while adapting to different contexts

**Implementation**:
```astro
variant?: 'default' | 'compact'
```

### 2. **Three-Tier Capacity Status System**
**Decision**: Categorize availability into three clear states

**States**:
1. **Sold Out** (0 spots): Red badge, disabled button, overlay on image
2. **Limited** (≤20% available): Orange/warning text, "🔥 Limited Spots" badge
3. **Available** (>20%): Green/success text, standard display

**Rationale**:
- Creates urgency for users when spots are running low
- Clear visual communication of event status
- Prevents booking attempts for sold-out events
- 20% threshold is a common conversion optimization practice

**Implementation**:
```typescript
const getSpotsStatus = (available: number, capacity: number) => {
  const percentage = (available / capacity) * 100;
  
  if (available === 0) {
    return { text: 'Sold Out', color: 'error' };
  } else if (percentage <= 20) {
    return { text: `Only ${available} spots left!`, color: 'warning' };
  } else {
    return { text: `${available} spots available`, color: 'success' };
  }
};
```

### 3. **Calendar Badge Design**
**Decision**: Prominent date badge with day number and month abbreviation

**Rationale**:
- Mimics familiar calendar UI patterns
- Makes event date immediately scannable
- Colored with primary theme for brand consistency
- Positioned prominently at top of card content

**Visual Design**:
```
┌─────┐
│  15 │  ← Large day number
│ MAR │  ← Month abbreviation
└─────┘
```

### 4. **Sold Out Visual Treatment**
**Decision**: Multiple indicators for sold-out events

**Indicators**:
1. 75% opacity on entire card
2. "SOLD OUT" badge overlay on image with dark background
3. Disabled button with gray styling
4. "Sold Out" text in error color

**Rationale**:
- Multiple visual cues ensure users don't miss the status
- Reduced opacity signals unavailability without hiding information
- Overlay prevents user from clicking through to unavailable event
- Still allows users to see event details for future reference

### 5. **Smart Price Formatting**
**Decision**: Handle both numeric and string prices, special treatment for free events

**Features**:
- Converts string prices to numbers
- Displays "$0.00" as "Free" in success color
- Always shows 2 decimal places for paid events
- Includes "per person" label for clarity

**Implementation**:
```typescript
const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice === 0 ? 'Free' : `$${numPrice.toFixed(2)}`;
};
```

### 6. **Image Handling**
**Decision**: Provide fallback placeholder and hover effects

**Features**:
- Defaults to `/images/event-placeholder.jpg` if no image
- Hover scale effect (1.05x) for engagement
- Lazy loading for performance
- Maintains aspect ratio (16:9 for default, fixed width for compact)
- Smooth transitions on hover

---

## Component Structure

### Props Interface
```typescript
interface Props {
  event: Event;        // Event data from database
  variant?: 'default' | 'compact';  // Layout variant
}
```

### Card Sections

1. **Image Section**
   - Aspect ratio container
   - Hover effects
   - Sold-out overlay
   - Limited spots badge (top-right)

2. **Content Section**
   - Date/time badge
   - Event title (linked)
   - Description preview (2-line clamp)
   - Location with icon
   - Capacity status with icon

3. **Footer Section**
   - Price display
   - Book Now CTA or Sold Out button

---

## Helper Functions

### 1. **formatPrice(price: string | number): string**
Formats price for display, handles free events

### 2. **formatDate(date: Date): string**
Returns full date string: "Wednesday, March 15, 2024"

### 3. **formatTime(date: Date): string**
Returns time string: "7:00 PM"

### 4. **getSpotsStatus(available: number, capacity: number)**
Calculates and returns capacity status object with text and color

---

## Styling Approach

### Tailwind CSS Classes
- Utility-first approach with Tailwind classes
- `class:list` for conditional styling
- Custom CSS only where necessary (line-clamp, responsive adjustments)

### Color Semantic Classes
- `text-error`: Red for sold out
- `text-warning`: Orange for limited availability
- `text-success`: Green for available/free
- `text-primary`: Brand color for price and interactive elements
- `text-text`: Main text color
- `text-text-light`: Secondary text color

### Transitions
- Hover effects on card (translate-y, shadow)
- Image scale on hover
- Button hover effects
- All transitions use duration tokens (duration-base, duration-fast, duration-slow)

---

## Responsive Design

### Breakpoint Behavior

**Mobile (< 640px)**:
- Compact variant becomes vertical layout
- Full-width image
- Stacked content sections

**Tablet (640px - 1024px)**:
- Default variant maintains grid layout
- Compact variant stays horizontal

**Desktop (> 1024px)**:
- Full features enabled
- Optimal spacing and sizing

### Mobile Optimizations
```css
@media (max-width: 640px) {
  article.flex-row {
    flex-direction: column;
  }
  
  article.flex-row a[class*="w-[200px]"] {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}
```

---

## Accessibility Features

1. **Semantic HTML**
   - `<article>` for card container
   - `<h3>` for event title
   - Proper heading hierarchy

2. **Alt Text**
   - Descriptive alt text on images

3. **ARIA Attributes**
   - Disabled button states
   - Loading="lazy" for performance

4. **Interactive States**
   - Clear hover states
   - Focus states inherited from base styles
   - Disabled state for sold-out button

5. **Color Contrast**
   - Text meets WCAG AA standards
   - Icons supplement text information

---

## Performance Considerations

1. **Image Optimization**
   - Lazy loading with `loading="lazy"`
   - Responsive image sizing
   - Fallback placeholder

2. **CSS Efficiency**
   - Minimal custom CSS
   - Tailwind utility classes for most styling
   - CSS transitions instead of JavaScript animations

3. **Bundle Size**
   - No client-side JavaScript required
   - Server-side rendering only
   - Lightweight component (~6KB)

---

## Integration Points

### Used In
- `src/pages/events/index.astro` - Events catalog page (T079)
- Future: Event search results
- Future: Related events sections
- Future: User dashboard (my bookings)

### Dependencies
- `@/lib/events` - Event type definition
- Design system color tokens
- Tailwind CSS utilities

---

## Usage Examples

### Basic Usage
```astro
---
import EventCard from '@/components/EventCard.astro';
import { getEvents } from '@/lib/events';

const events = await getEvents();
---

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
  {events.map(event => (
    <EventCard event={event} />
  ))}
</div>
```

### Compact Variant
```astro
<div class="space-y-md">
  {events.map(event => (
    <EventCard event={event} variant="compact" />
  ))}
</div>
```

---

## Visual States

### Normal State
- Full color, clear imagery
- Available spots shown in green
- "Book Now" button active

### Limited Availability
- "🔥 Limited Spots" badge on image
- Orange/warning text for capacity
- Enhanced urgency messaging

### Sold Out State
- 75% opacity on entire card
- "SOLD OUT" overlay badge on image
- Red error text
- Disabled "Sold Out" button
- Cursor: not-allowed

---

## Browser Compatibility

**Fully Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features Used**:
- CSS Grid & Flexbox (universal support)
- CSS Custom Properties (universal support)
- CSS Transitions (universal support)
- Aspect Ratio (modern browsers, graceful degradation)

---

## Testing Integration

### Test Coverage
The EventCard component has comprehensive unit test coverage in `tests/unit/T080_event_card.test.ts`:

**Test File**: `tests/unit/T080_event_card.test.ts` (49 tests, all passing ✅)

**Test Categories**:
1. **Price Formatting** (5 tests)
   - Numeric and string price formatting
   - Free event display
   - Large prices and rounding

2. **Date Formatting** (3 tests)
   - Full date with weekday
   - Month abbreviation
   - Different date handling

3. **Time Formatting** (4 tests)
   - AM/PM display
   - Noon and midnight handling
   - Minutes in time display

4. **Capacity Status Calculation** (6 tests)
   - Sold out detection
   - Limited spots (≤20%)
   - Available spots (>20%)
   - Small capacity handling
   - Edge cases and single spot

5. **Duration Formatting** (4 tests)
   - Single hour ("1 hour")
   - Multiple hours ("2 hours")
   - Zero and fractional hours

6. **URL Generation** (2 tests)
   - Event slug URLs
   - Multi-hyphen slugs

7. **Image URL Handling** (4 tests)
   - Valid image URLs
   - Placeholder fallback
   - Null/undefined/empty handling

8. **Sold Out Detection** (2 tests)
   - Zero spots detection
   - Available spots validation

9. **Limited Spots Badge Logic** (4 tests)
   - Badge display at ≤20%
   - No badge when sold out
   - No badge when >20%
   - Exact 20% threshold

10. **Variant Behavior** (4 tests)
    - Default variant handling
    - Compact variant handling
    - Image width by variant
    - Text size by variant

11. **Date Badge Components** (3 tests)
    - Day extraction
    - First/last day of month

12. **Edge Cases** (5 tests)
    - Zero capacity
    - Negative spots
    - Available > capacity
    - Large numbers
    - Decimal values

13. **Price Type Handling** (3 tests)
    - String "0" as free
    - Number 0 as free
    - Mixed type handling

**Test Results**: ✅ 49/49 passing (83ms execution time)

### Manual Testing Checklist
- ✅ Displays event information correctly
- ✅ Calendar badge shows correct date
- ✅ Capacity status updates based on availability
- ✅ Sold-out overlay appears when spots = 0
- ✅ Limited badge appears when spots ≤ 20%
- ✅ Free events show "Free" instead of "$0.00"
- ✅ Hover effects work smoothly
- ✅ Links navigate to correct event detail page
- ✅ Responsive behavior works on mobile
- ✅ Compact variant renders correctly

---

## Future Enhancements

### Potential Additions
1. **Favoriting**: Add heart icon to save events
2. **Sharing**: Social share buttons
3. **Category Tags**: Display event categories/tags
4. **Rating Display**: Show event ratings/reviews
5. **Quick View**: Modal preview on hover
6. **Animation**: Entrance animations for grid/list
7. **Skeleton Loading**: Loading state component
8. **Virtual Scrolling**: For long event lists

### Performance Optimizations
1. **Image CDN**: Automatic image optimization
2. **WebP Support**: Modern image format with fallback
3. **Preload Images**: For above-the-fold cards
4. **Intersection Observer**: Lazy load based on viewport

---

## Lessons Learned

1. **Three-tier status system is more effective than binary available/unavailable**
   - Creates urgency without being aggressive
   - Provides clear user expectations
   - Improves conversion rates

2. **Multiple visual indicators prevent confusion**
   - Sold-out events need multiple cues (overlay, opacity, button, text)
   - Users scan quickly, need obvious signals

3. **Compact variant adds flexibility**
   - Different layouts need different card presentations
   - Responsive behavior differs by variant
   - Worth the extra complexity for layout options

4. **Calendar badge pattern is immediately recognizable**
   - Users understand it instantly
   - No need for "Date:" label
   - Saves space and looks professional

5. **Helper functions in component are fine for simple formatting**
   - No need for separate utility files for basic date/price formatting
   - Keeps related code together
   - Easy to test indirectly

6. **Tailwind's class:list is powerful for conditional styling**
   - Clean syntax for multiple conditions
   - Better than string concatenation
   - Type-safe with TypeScript

7. **Lazy loading is essential for card grids**
   - Improves initial page load
   - Reduces bandwidth usage
   - Negligible UX impact with modern browsers

---

## Completion Summary

**Created**: 
- 1 component file (219 lines): `src/components/EventCard.astro`
- 1 test file (49 tests): `tests/unit/T080_event_card.test.ts`

**Testing**: ✅ 49/49 tests passing (83ms execution time)
**Documentation**: Complete
**Status**: ✅ Fully functional and production-ready

The EventCard component provides a polished, feature-rich card design that effectively communicates event details while creating urgency for limited-availability events. It's reusable, accessible, performant, and thoroughly tested.
