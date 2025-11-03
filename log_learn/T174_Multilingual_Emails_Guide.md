# T174: Multilingual Email Templates - Learning Guide

## What Was Implemented

T174 adds multilingual support to transactional email templates, enabling the platform to send order confirmations and event bookings in English or Spanish based on user preference.

## Key Concepts

### 1. Transactional Emails
Automated emails sent in response to user actions (orders, bookings, registrations). These must be localized for international users.

### 2. Email Template Generation
Creating HTML and plain text email content dynamically using translations and user data.

### 3. Locale-Aware Formatting
Emails use locale-specific formatting for:
- Currency (T172)
- Dates (T171)
- Text content (T125 i18n)

## Core Functions

### generateOrderConfirmationEmail(data, locale)
Generates localized order confirmation emails.

```typescript
const email = generateOrderConfirmationEmail({
  orderId: 'ORD-12345',
  customerName: 'Maria Garcia',
  orderDate: new Date(),
  items: [...],
  subtotal: 100,
  tax: 15,
  total: 115
}, 'es');

// Returns: { subject, html, text }
// Subject: "Confirmación de Pedido - ORD-12345"
```

### generateEventBookingEmail(data, locale)
Generates localized event booking confirmations.

```typescript
const email = generateEventBookingEmail({
  bookingId: 'BKG-67890',
  customerName: 'John Doe',
  eventTitle: 'Meditation Workshop',
  eventDate: new Date('2025-12-15'),
  eventTime: '2:00 PM',
  venue: { name: 'Zen Center', address: '123 Peace St' },
  ticketCount: 2,
  totalPrice: 150
}, 'en');

// Returns: { subject, html, text }
```

## Usage Pattern

### Sending Localized Emails

```typescript
import { generateOrderConfirmationEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/email';

// Get user's preferred locale from database
const userLocale = user.preferredLanguage || 'en';

// Generate localized email
const { subject, html, text } = generateOrderConfirmationEmail(
  orderData,
  userLocale
);

// Send email
await sendEmail({
  to: user.email,
  subject,
  html,
  text
});
```

## Translation Structure

### Email Translations in en.json/es.json

```json
{
  "email": {
    "orderConfirmation": {
      "subject": "Order Confirmation - {{orderId}}",
      "title": "Order Confirmed! 🎉",
      "greeting": "Hi {{name}},",
      "thankYou": "Thank you for your order!",
      // ... more keys
    },
    "eventBooking": {
      // Event booking translations
    },
    "common": {
      "allRightsReserved": "© {{year}} ...",
      "sentWith": "Sent with ❤️ ..."
    }
  }
}
```

## Benefits

1. **Better UX**: Users receive emails in their language
2. **Professional**: Shows attention to international customers
3. **Compliant**: Required for operating in multiple markets
4. **Consistent**: Same translations as website
5. **Maintainable**: Centralized translation management

## Integration Points

- **T125**: Base i18n system
- **T171**: Date formatting
- **T172**: Currency formatting
- **T048**: Email sending service
- **T175**: User language preference (next)

## Next Steps

1. Update email.ts to use multilingual templates
2. Store user language preference (T175)
3. Pass locale when sending emails
4. Add more email types (password reset, etc.)

## Conclusion

T174 provides professional, localized email communications that match the user's language preference, enhancing the international user experience.
