# T085: Email Templates & Multi-Channel Notifications - Learning Guide

## Overview

This guide teaches you how to create professional HTML email templates, integrate them into booking flows, and implement multi-channel notification systems. We'll cover email design, responsive layouts, map integration, and non-blocking notification patterns.

---

## Table of Contents

1. [HTML Email Fundamentals](#html-email-fundamentals)
2. [Email Template Design](#email-template-design)
3. [Map Link Integration](#map-link-integration)
4. [Multi-Channel Notifications](#multi-channel-notifications)
5. [Testing Email Systems](#testing-email-systems)
6. [Best Practices](#best-practices)

---

## HTML Email Fundamentals

### Why HTML Emails Are Different

Unlike modern web pages, email clients have limited HTML/CSS support:

```typescript
// ❌ DON'T: Modern CSS won't work in emails
<div style="display: grid; grid-template-columns: 1fr 1fr;">
  <div className="card">Content</div>
</div>

// ✅ DO: Use table layouts with inline styles
<table width="600" style="border-collapse: collapse;">
  <tr>
    <td style="padding: 20px; background-color: #f9fafb;">
      Content
    </td>
  </tr>
</table>
```

**Key Limitations**:
- No external CSS files (must use inline styles)
- No JavaScript
- Limited CSS3 support (gradients, transforms)
- No flexbox or grid in most clients
- No external fonts (use web-safe fonts)

### Table-Based Layouts

**Why Tables?**
Email clients have inconsistent CSS support, but tables work universally.

```typescript
function generateEmailHTML(data: EmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <!-- Main container -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <!-- Content wrapper (600px max width) -->
            <table width="600" cellpadding="0" cellspacing="0" 
                   style="background-color: white; border-radius: 8px;">
              <tr>
                <td style="padding: 32px;">
                  <!-- Email content goes here -->
                  ${data.content}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

**Layout Pattern**:
1. Outer table (100% width) - Centers content
2. Inner table (600px max) - Main content area
3. Nested tables - Sections and components

### Inline Styles

**Why Inline?**
Many email clients strip `<style>` tags, so styles must be inline.

```typescript
// ❌ DON'T: External styles won't work
<style>
  .header { background: purple; }
</style>
<div class="header">Title</div>

// ✅ DO: Inline all styles
<div style="background: #7c3aed; padding: 24px; color: white;">
  Title
</div>
```

**Inline Style Helper**:
```typescript
function styleToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([key, value]) => `${kebabCase(key)}: ${value}`)
    .join('; ');
}

// Usage
const headerStyles = styleToString({
  backgroundColor: '#7c3aed',
  padding: '24px',
  color: 'white',
  textAlign: 'center',
});

<td style="${headerStyles}">Header</td>
```

### Web-Safe Fonts

**Always Provide Fallbacks**:
```css
font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
```

**Safe Font Stack**:
- Arial (Windows, Mac, mobile)
- Helvetica (Mac, iOS)
- Georgia (serif alternative)
- Courier New (monospace)
- Verdana (readable at small sizes)

---

## Email Template Design

### Responsive Design for Emails

**Mobile-First Approach**:
```typescript
function generateResponsiveEmail(data: EmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style type="text/css">
        /* Some clients support media queries */
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .content { padding: 16px !important; }
        }
      </style>
    </head>
    <body>
      <table class="container" width="600" 
             style="max-width: 600px; width: 100%;">
        <tr>
          <td class="content" style="padding: 32px;">
            ${data.content}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

### Color System for Emails

**Use High-Contrast Colors**:
```typescript
const emailColors = {
  // Primary colors
  primary: '#7c3aed',      // Purple
  primaryLight: '#a855f7',  // Light purple
  
  // Backgrounds
  bgLight: '#f9fafb',       // Light gray
  bgYellow: '#fef3c7',      // Soft yellow
  bgBlue: '#eff6ff',        // Soft blue
  
  // Text
  textDark: '#111827',      // Almost black
  textGray: '#6b7280',      // Medium gray
  
  // Accents
  success: '#10b981',       // Green
  warning: '#f59e0b',       // Orange
  error: '#ef4444',         // Red
  info: '#3b82f6',          // Blue
};

// Usage in template
<td style="background: ${emailColors.bgYellow}; 
           border-left: 4px solid ${emailColors.warning}; 
           padding: 16px;">
  Important Information
</td>
```

### Component Patterns

**Header Component**:
```typescript
function EmailHeader(title: string, emoji?: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                   padding: 32px;
                   text-align: center;
                   border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;
                     color: white;
                     font-size: 28px;
                     font-weight: bold;">
            ${emoji ? emoji + ' ' : ''}${title}
          </h1>
        </td>
      </tr>
    </table>
  `;
}
```

**Info Box Component**:
```typescript
interface InfoBoxProps {
  title: string;
  content: string;
  backgroundColor: string;
  borderColor: string;
}

function EmailInfoBox(props: InfoBoxProps): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" 
           style="margin: 16px 0;">
      <tr>
        <td style="background-color: ${props.backgroundColor};
                   border-left: 4px solid ${props.borderColor};
                   padding: 20px;
                   border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0;
                     color: #111827;
                     font-size: 16px;
                     font-weight: 600;">
            ${props.title}
          </h3>
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            ${props.content}
          </div>
        </td>
      </tr>
    </table>
  `;
}

// Usage
const eventDetailsBox = EmailInfoBox({
  title: 'Event Details',
  content: `
    Date: ${eventDate}<br>
    Time: ${eventTime}<br>
    Venue: ${venueName}
  `,
  backgroundColor: '#fef3c7',
  borderColor: '#f59e0b',
});
```

**Button Component**:
```typescript
function EmailButton(text: string, url: string, color: string): string {
  return `
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius: 4px; background-color: ${color};">
          <a href="${url}" 
             style="display: inline-block;
                    padding: 12px 24px;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// Usage
${EmailButton('View on Map', mapLink, '#3b82f6')}
```

### Complete Template Example

```typescript
interface EventBookingEmailData {
  bookingId: string;
  customerName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: {
    name: string;
    address: string;
    mapLink?: string;
  };
  ticketCount: number;
  totalPrice: number;
}

function generateEventBookingEmail(data: EventBookingEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Booking Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" 
             style="background-color: #f3f4f6;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" 
                   style="background-color: white; border-radius: 8px; 
                          box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              ${EmailHeader('Event Booking Confirmed!', '🎫')}
              
              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  
                  <!-- Greeting -->
                  <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
                    Hi ${data.customerName},
                  </p>
                  
                  <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280;">
                    Your booking for <strong>${data.eventTitle}</strong> 
                    has been confirmed!
                  </p>
                  
                  <!-- Event Details Box -->
                  ${EmailInfoBox({
                    title: 'Event Details',
                    content: `
                      <strong>Date:</strong> ${data.eventDate}<br>
                      <strong>Time:</strong> ${data.eventTime}<br>
                      <strong>Venue:</strong> ${data.venue.name}<br>
                      <strong>Tickets:</strong> ${data.ticketCount}
                    `,
                    backgroundColor: '#fef3c7',
                    borderColor: '#f59e0b',
                  })}
                  
                  <!-- Venue Location Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" 
                         style="margin: 16px 0;">
                    <tr>
                      <td style="background-color: #f9fafb;
                                 padding: 20px;
                                 border-radius: 4px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px;">
                          📍 Venue Location
                        </h3>
                        <p style="margin: 0 0 12px 0; color: #6b7280;">
                          ${data.venue.address}
                        </p>
                        ${data.venue.mapLink ? EmailButton(
                          'View on Map',
                          data.venue.mapLink,
                          '#3b82f6'
                        ) : ''}
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Booking Reference -->
                  ${EmailInfoBox({
                    title: 'Booking Reference',
                    content: `Your booking ID: <strong>${data.bookingId}</strong>`,
                    backgroundColor: '#eff6ff',
                    borderColor: '#3b82f6',
                  })}
                  
                  <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
                    See you at the event! 🙏
                  </p>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb;
                           padding: 24px;
                           text-align: center;
                           border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    © 2025 Spirituality Platform. All rights reserved.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

### Plain Text Alternative

**Always Provide Text Version**:
```typescript
function generatePlainTextEmail(data: EventBookingEmailData): string {
  return `
Event Booking Confirmation

Hi ${data.customerName},

Your booking for ${data.eventTitle} has been confirmed!

EVENT DETAILS
─────────────
Date: ${data.eventDate}
Time: ${data.eventTime}
Venue: ${data.venue.name}
Tickets: ${data.ticketCount}

VENUE LOCATION
──────────────
${data.venue.address}
${data.venue.mapLink ? `View on map: ${data.venue.mapLink}` : ''}

BOOKING REFERENCE
─────────────────
Booking ID: ${data.bookingId}

See you at the event!

─────────────────
© 2025 Spirituality Platform
  `.trim();
}
```

---

## Map Link Integration

### Google Maps URL Format

**Basic Format**:
```typescript
function generateGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// Usage
const mapLink = generateGoogleMapsLink(37.7749, -122.4194);
// https://www.google.com/maps?q=37.7749,-122.4194
```

**With Place Name**:
```typescript
function generateMapsLinkWithName(
  lat: number,
  lng: number,
  placeName: string
): string {
  const encodedName = encodeURIComponent(placeName);
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodedName}`;
}
```

**With Tracking Parameters**:
```typescript
function generateTrackedMapLink(
  lat: number,
  lng: number,
  source: string = 'email'
): string {
  const baseUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: 'booking',
    utm_campaign: 'event_confirmation',
  });
  return `${baseUrl}&${params.toString()}`;
}
```

### Handling Missing Coordinates

**Graceful Fallback**:
```typescript
interface VenueWithOptionalCoords {
  name: string;
  address: string;
  lat?: number | string;
  lng?: number | string;
}

function getVenueMapLink(venue: VenueWithOptionalCoords): string | undefined {
  // Check both coordinates exist
  if (!venue.lat || !venue.lng) {
    return undefined;
  }
  
  // Convert to numbers if strings
  const lat = typeof venue.lat === 'string' 
    ? parseFloat(venue.lat) 
    : venue.lat;
  const lng = typeof venue.lng === 'string' 
    ? parseFloat(venue.lng) 
    : venue.lng;
  
  // Validate numeric values
  if (isNaN(lat) || isNaN(lng)) {
    return undefined;
  }
  
  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }
  
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// In template
${venue.mapLink ? `
  <a href="${venue.mapLink}" style="...">
    📍 View on Map
  </a>
` : ''}
```

### Alternative Map Services

**Apple Maps (iOS)**:
```typescript
function generateAppleMapsLink(lat: number, lng: number): string {
  return `https://maps.apple.com/?ll=${lat},${lng}`;
}
```

**OpenStreetMap**:
```typescript
function generateOSMLink(lat: number, lng: number, zoom: number = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`;
}
```

**Multi-Service Link**:
```typescript
function generateUniversalMapLink(lat: number, lng: number): string {
  // Works on both mobile and desktop
  return `geo:${lat},${lng}`;
}
```

---

## Multi-Channel Notifications

### Notification Architecture

**Service Pattern**:
```typescript
// Base notification interface
interface NotificationChannel {
  send(data: NotificationData): Promise<NotificationResult>;
  isAvailable(): Promise<boolean>;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email channel
class EmailNotificationChannel implements NotificationChannel {
  async send(data: EmailData): Promise<NotificationResult> {
    // Send email via Resend
  }
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.RESEND_API_KEY;
  }
}

// WhatsApp channel
class WhatsAppNotificationChannel implements NotificationChannel {
  async send(data: WhatsAppData): Promise<NotificationResult> {
    // Send WhatsApp via Twilio
  }
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.TWILIO_ACCOUNT_SID;
  }
}

// SMS channel
class SMSNotificationChannel implements NotificationChannel {
  async send(data: SMSData): Promise<NotificationResult> {
    // Send SMS via Twilio
  }
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.TWILIO_ACCOUNT_SID;
  }
}
```

### Notification Manager

**Orchestration Layer**:
```typescript
class NotificationManager {
  private channels: Map<string, NotificationChannel> = new Map();
  
  registerChannel(name: string, channel: NotificationChannel): void {
    this.channels.set(name, channel);
  }
  
  async sendToAll(
    data: NotificationData,
    channelNames: string[]
  ): Promise<Record<string, NotificationResult>> {
    const results: Record<string, NotificationResult> = {};
    
    await Promise.all(
      channelNames.map(async (name) => {
        const channel = this.channels.get(name);
        if (!channel) {
          results[name] = { 
            success: false, 
            error: 'Channel not registered' 
          };
          return;
        }
        
        if (!(await channel.isAvailable())) {
          results[name] = { 
            success: false, 
            error: 'Channel not available' 
          };
          return;
        }
        
        try {
          results[name] = await channel.send(data);
        } catch (error) {
          results[name] = { 
            success: false, 
            error: String(error) 
          };
        }
      })
    );
    
    return results;
  }
}

// Usage
const notificationManager = new NotificationManager();
notificationManager.registerChannel('email', new EmailNotificationChannel());
notificationManager.registerChannel('whatsapp', new WhatsAppNotificationChannel());
notificationManager.registerChannel('sms', new SMSNotificationChannel());

// Send to all available channels
const results = await notificationManager.sendToAll(bookingData, [
  'email',
  'whatsapp',
  'sms',
]);
```

### Non-Blocking Pattern

**Fire-and-Forget**:
```typescript
async function createBooking(data: BookingData): Promise<Booking> {
  // 1. Create booking in database
  const booking = await db.bookings.create(data);
  
  // 2. Send notifications asynchronously (don't await)
  sendNotifications(booking).catch((error) => {
    console.error('Notification error:', error);
    // Log to error tracking service
  });
  
  // 3. Return immediately
  return booking;
}

async function sendNotifications(booking: Booking): Promise<void> {
  // This runs in background
  const results = await notificationManager.sendToAll(booking, [
    'email',
    'whatsapp',
  ]);
  
  // Update database flags
  await db.bookings.update(booking.id, {
    email_notified: results.email?.success ?? false,
    whatsapp_notified: results.whatsapp?.success ?? false,
  });
}
```

**Background Queue** (Production):
```typescript
import { Queue } from 'bullmq';

const notificationQueue = new Queue('notifications', {
  connection: redis,
});

async function createBooking(data: BookingData): Promise<Booking> {
  const booking = await db.bookings.create(data);
  
  // Add to queue (processed by worker)
  await notificationQueue.add('send-booking-confirmation', {
    bookingId: booking.id,
    channels: ['email', 'whatsapp'],
  });
  
  return booking;
}

// Worker process
const worker = new Worker('notifications', async (job) => {
  const { bookingId, channels } = job.data;
  const booking = await db.bookings.findById(bookingId);
  
  const results = await notificationManager.sendToAll(booking, channels);
  
  await db.bookings.update(bookingId, {
    email_notified: results.email?.success ?? false,
    whatsapp_notified: results.whatsapp?.success ?? false,
  });
});
```

### Channel Priority

**Fallback Chain**:
```typescript
async function sendWithFallback(
  data: NotificationData,
  channels: string[]
): Promise<NotificationResult> {
  for (const channelName of channels) {
    const channel = notificationManager.getChannel(channelName);
    
    if (!channel || !(await channel.isAvailable())) {
      continue;
    }
    
    const result = await channel.send(data);
    
    if (result.success) {
      return result;
    }
  }
  
  return {
    success: false,
    error: 'All channels failed',
  };
}

// Usage: Try email first, fallback to SMS
const result = await sendWithFallback(bookingData, ['email', 'sms']);
```

---

## Testing Email Systems

### Mock Email Service

```typescript
// tests/mocks/email-service.mock.ts
export class MockEmailService {
  private sentEmails: Array<{ to: string; data: any }> = [];
  private shouldFail: boolean = false;
  
  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }
  
  async send(to: string, data: any): Promise<NotificationResult> {
    if (this.shouldFail) {
      return { success: false, error: 'Mock failure' };
    }
    
    this.sentEmails.push({ to, data });
    return { success: true, messageId: `mock-${Date.now()}` };
  }
  
  getSentEmails(): Array<{ to: string; data: any }> {
    return [...this.sentEmails];
  }
  
  reset(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
```

### Testing Template Rendering

```typescript
describe('Email Template Rendering', () => {
  it('should render complete HTML email', () => {
    const data: EventBookingEmailData = {
      bookingId: 'booking-123',
      customerName: 'John Doe',
      eventTitle: 'Meditation Workshop',
      eventDate: 'Saturday, June 15, 2024',
      eventTime: '6:00 PM',
      venue: {
        name: 'Zen Center',
        address: '123 Peace St, San Francisco, USA',
        mapLink: 'https://www.google.com/maps?q=37.7749,-122.4194',
      },
      ticketCount: 2,
      totalPrice: 100,
    };
    
    const html = generateEventBookingEmail(data);
    
    // Check structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<table');
    
    // Check content
    expect(html).toContain('John Doe');
    expect(html).toContain('Meditation Workshop');
    expect(html).toContain('booking-123');
    expect(html).toContain('View on Map');
    
    // Check no unclosed tags
    const openTables = (html.match(/<table/g) || []).length;
    const closeTables = (html.match(/<\/table>/g) || []).length;
    expect(openTables).toBe(closeTables);
  });
  
  it('should omit map link when coordinates unavailable', () => {
    const data = {
      // ... same data
      venue: {
        name: 'Venue',
        address: 'Address',
        mapLink: undefined,
      },
    };
    
    const html = generateEventBookingEmail(data);
    
    expect(html).not.toContain('View on Map');
    expect(html).toContain('Address'); // Still shows address
  });
  
  it('should escape HTML in user content', () => {
    const data = {
      // ... same data
      customerName: '<script>alert("xss")</script>',
    };
    
    const html = generateEventBookingEmail(data);
    
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

### Integration Testing

```typescript
describe('Email Notification Integration', () => {
  let mockEmailService: MockEmailService;
  
  beforeEach(() => {
    mockEmailService = new MockEmailService();
  });
  
  it('should send email after booking creation', async () => {
    const booking = await createBooking({
      eventId: 'event-123',
      userId: 'user-123',
      attendees: 2,
    });
    
    // Wait for async notification
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const sentEmails = mockEmailService.getSentEmails();
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(booking.userEmail);
    expect(sentEmails[0].data.bookingId).toBe(booking.id);
  });
  
  it('should update email_notified flag on success', async () => {
    const booking = await createBooking({...});
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const updated = await db.bookings.findById(booking.id);
    expect(updated.email_notified).toBe(true);
  });
  
  it('should not block booking if email fails', async () => {
    mockEmailService.setShouldFail(true);
    
    const booking = await createBooking({...});
    
    expect(booking).toBeDefined();
    expect(booking.id).toBeTruthy();
  });
});
```

---

## Best Practices

### 1. Always Provide Plain Text

```typescript
// Both versions in every email
const email = {
  to: user.email,
  subject: 'Booking Confirmation',
  html: generateHTMLEmail(data),
  text: generatePlainTextEmail(data),
};
```

**Why?**
- Accessibility (screen readers)
- Email client compatibility
- Spam filter scores
- User preference

### 2. Responsive Design

```typescript
// Use max-width and relative widths
<table width="600" style="max-width: 600px; width: 100%;">
  <tr>
    <td style="padding: 32px;">
      Content
    </td>
  </tr>
</table>

// Media queries for advanced clients
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .content { padding: 16px !important; }
  }
</style>
```

### 3. Test Across Clients

**Major Clients to Test**:
- Gmail (desktop, mobile app, iOS Mail)
- Outlook (Windows, Mac, Office 365)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Mobile clients (Android, iOS)

**Testing Tools**:
- [Litmus](https://litmus.com) - Email preview across clients
- [Email on Acid](https://www.emailonacid.com) - Similar to Litmus
- [Mailtrap](https://mailtrap.io) - Safe email testing
- [Resend](https://resend.com) - Built-in preview

### 4. Optimize Images

```typescript
// Always specify dimensions
<img src="logo.png" 
     width="200" 
     height="50" 
     alt="Company Logo"
     style="display: block; max-width: 100%;">

// Use alt text for accessibility
alt="Event location map showing venue at 123 Peace Street"

// Host on CDN
src="https://cdn.example.com/images/logo.png"
```

### 5. Accessibility

```typescript
// Semantic HTML
<h1>Main Title</h1>
<h2>Section Title</h2>
<p>Body text</p>

// High contrast
color: #111827; (dark text)
background: #ffffff; (white background)

// Alt text for images
<img src="map.png" alt="Map showing venue location">

// Link text (not "click here")
<a href="...">View event details</a>
```

### 6. Security

```typescript
// Escape all user content
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

// Validate email addresses
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sanitize URLs
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '#';
    }
    return url;
  } catch {
    return '#';
  }
}
```

### 7. Deliverability

**SPF/DKIM/DMARC**:
```typescript
// Configure in DNS
// SPF: Authorize sending servers
// DKIM: Sign emails cryptographically
// DMARC: Handle failed authentication

// Use dedicated email service (Resend, SendGrid, etc.)
// They handle authentication automatically
```

**Avoid Spam Triggers**:
```typescript
// ❌ DON'T
- ALL CAPS SUBJECT LINES
- Excessive exclamation marks!!!!
- Misleading subject lines
- Large images, small text
- Too many links

// ✅ DO
- Clear, honest subject lines
- Balanced text-to-image ratio
- Unsubscribe link (required)
- Physical mailing address (required)
- Consistent "From" name/email
```

### 8. Performance

```typescript
// Keep HTML under 102KB (Gmail clips larger emails)
function getEmailSize(html: string): number {
  return new Blob([html]).size;
}

if (getEmailSize(html) > 102 * 1024) {
  console.warn('Email exceeds 102KB, may be clipped');
}

// Optimize inline CSS
// Remove unused styles
// Minify HTML (carefully - preserve structure)
```

### 9. Error Handling

```typescript
async function sendEmailSafely(data: EmailData): Promise<NotificationResult> {
  try {
    // Validate data
    if (!isValidEmail(data.to)) {
      return { success: false, error: 'Invalid email address' };
    }
    
    if (!data.subject || !data.html) {
      return { success: false, error: 'Missing required fields' };
    }
    
    // Send email
    const result = await emailService.send(data);
    
    // Log success
    console.log('Email sent:', result.messageId);
    
    return result;
  } catch (error) {
    // Log error (but don't throw)
    console.error('Email send failed:', error);
    
    // Track error in monitoring service
    await errorTracker.captureException(error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### 10. Tracking & Analytics

```typescript
// Add tracking pixel
function addTrackingPixel(html: string, bookingId: string): string {
  const pixel = `
    <img src="https://api.example.com/track/open?id=${bookingId}" 
         width="1" 
         height="1" 
         alt="" 
         style="display:block;">
  `;
  return html.replace('</body>', `${pixel}</body>`);
}

// Track link clicks
function addClickTracking(url: string, bookingId: string): string {
  return `https://api.example.com/track/click?id=${bookingId}&url=${encodeURIComponent(url)}`;
}

// Usage
<a href="${addClickTracking(mapLink, bookingId)}">
  View on Map
</a>
```

---

## Conclusion

This guide covered:
- ✅ HTML email fundamentals (table layouts, inline styles)
- ✅ Professional template design (components, colors, responsiveness)
- ✅ Map link integration (Google Maps, fallbacks, validation)
- ✅ Multi-channel notifications (architecture, non-blocking, priority)
- ✅ Comprehensive testing (mocks, templates, integration)
- ✅ Best practices (accessibility, security, deliverability)

**Key Takeaways**:
1. Always provide plain text alternatives
2. Use table layouts for maximum compatibility
3. Inline all styles
4. Test across major email clients
5. Handle errors gracefully (never block user actions)
6. Validate and sanitize all user content
7. Implement non-blocking notification patterns
8. Track delivery status in database
9. Make emails accessible
10. Monitor deliverability and engagement

For T085, we successfully integrated email notifications by reusing an existing service, implementing map link generation, and combining multiple notification channels in a non-blocking architecture. The result is a professional, reliable notification system that enhances user experience while maintaining fast API response times.
