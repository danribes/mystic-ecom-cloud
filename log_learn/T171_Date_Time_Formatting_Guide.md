# T171: Date/Time Formatting - Learning Guide

## What Was Implemented

T171 implements comprehensive locale-aware date and time formatting utilities using native JavaScript Internationalization APIs (Intl.DateTimeFormat and Intl.RelativeTimeFormat). The library provides 15 functions covering all common date/time formatting needs.

## Key Concepts

### 1. Intl.DateTimeFormat API
The native JavaScript API for formatting dates according to locale-specific conventions.

```typescript
const formatter = new Intl.DateTimeFormat('es', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

formatter.format(new Date('2025-11-02'));
// Output: "2 de noviembre de 2025"
```

### 2. Intl.RelativeTimeFormat API
Formats time differences as relative strings ("2 hours ago", "in 3 days").

```typescript
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');  // "yesterday"
rtf.format(2, 'day');   // "in 2 days"
rtf.format(-3, 'hour'); // "3 hours ago"
```

### 3. Flexible Input Handling
All functions accept both Date objects and ISO date strings:

```typescript
formatDateLong(new Date('2025-11-02'), 'en');
// or
formatDateLong('2025-11-02', 'en');
// Both work correctly
```

### 4. Default Locale Fallback
Functions default to English when no locale is specified:

```typescript
formatDateShort(new Date()); // Uses 'en' by default
```

## Core Functions

### Date Formatting

**formatDateShort(date, locale)**
```typescript
formatDateShort(new Date('2025-11-02'), 'en');  // "11/2/2025"
formatDateShort(new Date('2025-11-02'), 'es');  // "2/11/2025"
```

**formatDateMedium(date, locale)**
```typescript
formatDateMedium(new Date('2025-11-02'), 'en'); // "Nov 2, 2025"
formatDateMedium(new Date('2025-11-02'), 'es'); // "2 nov 2025"
```

**formatDateLong(date, locale)**
```typescript
formatDateLong(new Date('2025-11-02'), 'en'); // "November 2, 2025"
formatDateLong(new Date('2025-11-02'), 'es'); // "2 de noviembre de 2025"
```

**formatDateFull(date, locale)**
```typescript
formatDateFull(new Date('2025-11-02'), 'en'); // "Sunday, November 2, 2025"
formatDateFull(new Date('2025-11-02'), 'es'); // "domingo, 2 de noviembre de 2025"
```

### Time Formatting

**formatTime(date, locale)**
```typescript
formatTime(new Date('2025-11-02T14:30:00'), 'en'); // "2:30 PM"
formatTime(new Date('2025-11-02T14:30:00'), 'es'); // "14:30"
```

**formatTimeWithSeconds(date, locale)**
```typescript
formatTimeWithSeconds(new Date('2025-11-02T14:30:45'), 'en'); // "2:30:45 PM"
formatTimeWithSeconds(new Date('2025-11-02T14:30:45'), 'es'); // "14:30:45"
```

### Combined Date/Time

**formatDateTime(date, locale)**
```typescript
formatDateTime(new Date('2025-11-02T14:30:00'), 'en'); // "Nov 2, 2025, 2:30 PM"
formatDateTime(new Date('2025-11-02T14:30:00'), 'es'); // "2 nov 2025, 14:30"
```

**formatDateTimeLong(date, locale)**
```typescript
formatDateTimeLong(new Date('2025-11-02T14:30:00'), 'en');
// "November 2, 2025 at 2:30 PM"

formatDateTimeLong(new Date('2025-11-02T14:30:00'), 'es');
// "2 de noviembre de 2025, 14:30"
```

### Specialized Formatting

**formatRelativeTime(date, locale)**
```typescript
const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
formatRelativeTime(pastDate, 'en'); // "1 hour ago"
formatRelativeTime(pastDate, 'es'); // "hace 1 hora"

const futureDate = new Date(Date.now() + 86400000); // 1 day from now
formatRelativeTime(futureDate, 'en'); // "tomorrow"
formatRelativeTime(futureDate, 'es'); // "mañana"
```

**formatMonthYear(date, locale)**
```typescript
formatMonthYear(new Date('2025-11-02'), 'en'); // "November 2025"
formatMonthYear(new Date('2025-11-02'), 'es'); // "noviembre de 2025"
```

**formatWeekday(date, locale)**
```typescript
formatWeekday(new Date('2025-11-03'), 'en'); // "Monday"
formatWeekday(new Date('2025-11-03'), 'es'); // "lunes"
```

**formatDateRange(startDate, endDate, locale)**
```typescript
// Same month
formatDateRange(
  new Date('2025-11-02'),
  new Date('2025-11-05'),
  'en'
); // "2 – Nov 5, 2025"

// Different months, same year
formatDateRange(
  new Date('2025-11-28'),
  new Date('2025-12-05'),
  'en'
); // "Nov 28 – Dec 5, 2025"

// Different years
formatDateRange(
  new Date('2025-12-28'),
  new Date('2026-01-05'),
  'en'
); // "Dec 28, 2025 – Jan 5, 2026"
```

### Helper Functions

**isToday(date)**
```typescript
isToday(new Date()); // true
isToday(new Date('2025-11-01')); // false (if today is not Nov 1)
```

**isPast(date)**
```typescript
isPast(new Date('2020-01-01')); // true
isPast(new Date('2030-01-01')); // false
```

**isFuture(date)**
```typescript
isFuture(new Date('2030-01-01')); // true
isFuture(new Date('2020-01-01')); // false
```

**daysBetween(startDate, endDate)**
```typescript
daysBetween(new Date('2025-11-01'), new Date('2025-11-05')); // 4
daysBetween(new Date('2025-11-05'), new Date('2025-11-01')); // -4
```

## Implementation Pattern

### Basic Structure
```typescript
export function formatDateShort(date: Date | string, locale: Locale = 'en'): string {
  // 1. Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // 2. Create formatter with locale and options
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(dateObj);
}
```

### Relative Time Logic
```typescript
export function formatRelativeTime(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();

  // Calculate differences in various units
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Choose the most appropriate unit
  if (Math.abs(diffYear) >= 1) {
    return rtf.format(diffYear, 'year');
  } else if (Math.abs(diffMonth) >= 1) {
    return rtf.format(diffMonth, 'month');
  }
  // ... etc
}
```

## Usage in Astro Pages

```astro
---
import {
  formatDateLong,
  formatTime,
  formatRelativeTime,
  formatDateRange,
  daysBetween,
  isToday
} from '@/lib/dateTimeFormat';

const locale = Astro.locals.locale || 'en';
const event = await getLocalizedEventById(id, locale);
---

<div class="event-details">
  <h1>{event.title}</h1>

  <!-- Full date display -->
  <p class="event-date">
    {formatDateLong(event.startDate, locale)}
  </p>

  <!-- Time -->
  <p class="event-time">
    {formatTime(event.startDate, locale)}
  </p>

  <!-- Relative time (how long ago posted) -->
  <p class="posted">
    Posted {formatRelativeTime(event.createdAt, locale)}
  </p>

  <!-- Date range for multi-day events -->
  {event.endDate && (
    <p class="duration">
      {formatDateRange(event.startDate, event.endDate, locale)}
    </p>
  )}

  <!-- Days until event -->
  {isFuture(event.startDate) && (
    <p class="countdown">
      {daysBetween(new Date(), event.startDate)} days until event
    </p>
  )}

  <!-- Special styling for today's events -->
  {isToday(event.startDate) && (
    <span class="badge">Today!</span>
  )}
</div>
```

## Usage in Components

```typescript
import {
  formatDateTime,
  formatRelativeTime,
  daysBetween
} from '@/lib/dateTimeFormat';

interface Props {
  createdAt: Date;
  publishedAt?: Date;
  locale: 'en' | 'es';
}

const { createdAt, publishedAt, locale } = Astro.props;

const timeAgo = formatRelativeTime(createdAt, locale);
const formattedPublish = publishedAt
  ? formatDateTime(publishedAt, locale)
  : null;
```

## Benefits

1. **No Dependencies**: Uses native browser APIs (Intl)
2. **Automatic Localization**: Formats adapt to locale conventions
3. **Type Safe**: TypeScript ensures correct usage
4. **Consistent**: Single source of truth for date/time formatting
5. **Flexible Input**: Accepts Date objects or ISO strings
6. **Comprehensive**: Covers all common formatting needs
7. **Smart Defaults**: Falls back to English locale

## Locale Differences

### Date Order
- **English (en)**: Month/Day/Year → 11/2/2025
- **Spanish (es)**: Day/Month/Year → 2/11/2025

### Time Format
- **English (en)**: 12-hour with AM/PM → 2:30 PM
- **Spanish (es)**: 24-hour → 14:30

### Month Names
- **English**: January, February, March...
- **Spanish**: enero, febrero, marzo...

### Weekday Names
- **English**: Monday, Tuesday, Wednesday...
- **Spanish**: lunes, martes, miércoles...

### Relative Time
- **English**: "2 hours ago", "in 3 days", "yesterday"
- **Spanish**: "hace 2 horas", "en 3 días", "ayer"

## Testing Considerations

### Timezone Independence
Tests should be timezone-agnostic since formatting uses local timezone:

```typescript
// ✅ Good: Tests format pattern, not exact value
expect(formatTime(date, 'en')).toMatch(/\d{1,2}:\d{2}/);

// ❌ Bad: Brittle, depends on test environment timezone
expect(formatTime(date, 'en')).toBe('2:30 PM');
```

### Edge Cases to Test
- Leap year dates (Feb 29)
- Year boundaries (Dec 31 → Jan 1)
- Midnight (00:00)
- Noon (12:00)
- Same date comparisons
- Negative day ranges

## Integration with Other Tasks

- **T125**: Locale utilities provide the `Locale` type
- **T163**: Middleware sets `Astro.locals.locale`
- **T168**: Format course dates
- **T169**: Format event dates and times
- **T170**: Format product release dates
- **T172**: Currency formatting (next task, similar pattern)

## Common Patterns

### Event Listing
```typescript
events.map(event => ({
  ...event,
  formattedDate: formatDateLong(event.startDate, locale),
  formattedTime: formatTime(event.startDate, locale),
  timeUntil: formatRelativeTime(event.startDate, locale)
}))
```

### Blog Post Metadata
```typescript
const publishedDate = formatDateMedium(post.publishedAt, locale);
const timeAgo = formatRelativeTime(post.publishedAt, locale);
```

### Multi-Day Event Duration
```typescript
if (event.endDate) {
  const dateRange = formatDateRange(event.startDate, event.endDate, locale);
  const duration = daysBetween(event.startDate, event.endDate);
}
```

## Next Steps

- Use throughout the application for consistent date/time display
- Replace any hardcoded date formatting
- Consider adding more locales (fr, de, pt, etc.)
- Integrate with notification systems for relative times
- Use in admin interfaces for timestamps

## Conclusion

T171 provides a comprehensive, locale-aware date/time formatting library that covers all common use cases. By leveraging native Intl APIs, it provides automatic localization without external dependencies while maintaining type safety and consistent formatting across the application.
