# T073: Twilio WhatsApp Integration - Implementation Log

## Task Overview
**Task ID**: T073  
**User Story**: US5 (Admin Management)  
**Description**: Create `src/lib/twilio.ts` - Twilio WhatsApp integration for admin notifications  
**Status**: ✅ Completed  
**Date**: November 1, 2025

---

## Files Created/Modified

### Created Files
1. **src/lib/twilio.ts** (318 lines)
   - Twilio client initialization
   - WhatsApp message sending with retry logic
   - Admin notification functions
   - Error handling and logging

2. **tests/e2e/T073_twilio_whatsapp.spec.ts** (389 lines)
   - Configuration and initialization tests
   - Message sending tests
   - Admin notification tests
   - Error handling tests
   - Message formatting tests

### Modified Files
1. **.env.example**
   - Updated Twilio WhatsApp configuration section
   - Changed `TWILIO_ADMIN_WHATSAPP` to `ADMIN_WHATSAPP_NUMBERS` (comma-separated list)
   - Added detailed comments for each variable

---

## Implementation Details

### Core Functionality

#### 1. Twilio Client Initialization
```typescript
function getTwilioClient()
```
- Lazy initialization of Twilio client
- Singleton pattern to reuse client across requests
- Throws error if credentials are missing
- Credentials loaded from environment variables

#### 2. Message Sending
```typescript
async function sendWhatsAppMessage(
  to: string,
  message: string,
  options: { retries?: number; mediaUrl?: string[] }
): Promise<string | null>
```

**Features**:
- Automatic phone number formatting (adds `whatsapp:` prefix)
- Retry logic with exponential backoff (default 3 retries)
- Support for media attachments
- Returns message SID on success, null on failure
- Detailed error logging

**Retry Strategy**:
- Attempt 1: Immediate
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds
- Formula: `2^attempt` seconds between retries

#### 3. Bulk Messaging
```typescript
async function sendBulkWhatsAppMessages(
  recipients: string[],
  message: string,
  options: { mediaUrl?: string[] }
): Promise<(string | null)[]>
```

- Send same message to multiple recipients
- Parallel execution using `Promise.all()`
- Returns array of message SIDs (null for failed messages)
- Used for admin notifications

### Admin Notification Functions

#### 1. New Order Notification
```typescript
async function notifyAdminsNewOrder(orderData)
```

**Sends**:
- Order ID
- Customer name and email
- Itemized list with quantities and prices
- Total amount
- Link prompt to admin dashboard

**Format**:
```
🛒 *New Order Received!*

Order ID: ORD-12345
Customer: John Doe
Email: john@example.com

*Items:*
• Course Name (x1) - $99.99
• Product Name (x2) - $49.98

*Total: $149.97*

View details in admin dashboard.
```

#### 2. Event Booking Notification
```typescript
async function notifyAdminsNewBooking(bookingData)
```

**Sends**:
- Booking ID
- Event title and formatted date
- Customer name and email
- Number of tickets
- Total amount

**Format**:
```
📅 *New Event Booking!*

Booking ID: BOOK-789
Event: Spiritual Retreat
Date: Friday, December 15, 2025 at 10:00 AM

Customer: Jane Smith
Email: jane@example.com
Tickets: 2

*Total: $299.98*

View details in admin dashboard.
```

#### 3. Low Stock Alert
```typescript
async function notifyAdminsLowStock(productData)
```

**Sends**:
- Product ID and title
- Current stock level
- Threshold level
- Restock prompt

#### 4. Event Capacity Alert
```typescript
async function notifyAdminsEventCapacity(eventData)
```

**Sends**:
- Event ID and title
- Booked seats vs total capacity
- Percentage full
- Special warning if >= 90% full

#### 5. Custom Notification
```typescript
async function notifyAdminsCustom(title, message, mediaUrl?)
```

- Flexible function for any admin notification
- Optional media attachments
- Custom title and message

### Configuration Verification

```typescript
function verifyTwilioConfig(): boolean
```

Checks that all required configuration is present:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `ADMIN_WHATSAPP_NUMBERS` (at least one number)

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID from console | `ACxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number | `whatsapp:+14155238886` |
| `ADMIN_WHATSAPP_NUMBERS` | Comma-separated admin numbers | `whatsapp:+1234567890,whatsapp:+0987654321` |

### Getting Twilio Credentials

1. Sign up at https://www.twilio.com/
2. Navigate to Console Dashboard
3. Find Account SID and Auth Token
4. For WhatsApp:
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Use Twilio Sandbox number: `whatsapp:+14155238886`
   - For production: Apply for WhatsApp Business API approval

### Phone Number Format

All phone numbers must be in E.164 format with `whatsapp:` prefix:
- ✅ Correct: `whatsapp:+1234567890`
- ✅ Correct: `whatsapp:+34612345678`
- ❌ Wrong: `+1234567890` (missing prefix)
- ❌ Wrong: `1234567890` (missing + and prefix)

The library automatically adds the prefix if missing.

---

## Test Coverage

### Test Suites (15 tests total)

1. **Configuration and Initialization** (2 tests)
   - Environment variables presence
   - Phone number formatting

2. **Message Sending** (4 tests)
   - Simple message sending
   - Invalid phone number handling
   - Retry mechanism
   - Bulk messaging

3. **Admin Notifications** (6 tests)
   - New order notification
   - New booking notification
   - Low stock alert
   - Event capacity alert
   - Custom notification
   - Missing admin numbers handling

4. **Configuration Verification** (1 test)
   - Verify Twilio configuration

5. **Error Handling** (2 tests)
   - Missing credentials handling
   - Network errors with retry

6. **Message Formatting** (2 tests)
   - Order notification formatting
   - Special characters handling

### Test Execution

Tests are conditionally skipped if Twilio is not configured:
```bash
# Run all E2E tests
npm run test:e2e

# Run only T073 E2E tests (use specific path to avoid unit test conflicts)
npx playwright test tests/e2e/T073

# Alternative: Run with full filename
npx playwright test tests/e2e/T073_twilio_whatsapp.spec.ts
```

**Important**: Do NOT use `npx playwright test T073` as it will also pick up unit tests in `tests/unit/T073-T074-whatsapp-service.test.ts`, causing vitest/Playwright matcher conflicts.

**Note**: Tests will send real WhatsApp messages if credentials are configured. Use test phone numbers or Twilio Sandbox.

---

## Integration Points

### 1. Stripe Webhook Handler (T047)
When implemented, add to `src/pages/api/checkout/webhook.ts`:
```typescript
import { notifyAdminsNewOrder } from '@/lib/twilio';

// After successful order creation
await notifyAdminsNewOrder({
  orderId: order.id,
  customerName: order.user_name,
  customerEmail: order.user_email,
  totalAmount: order.total_amount,
  items: order.items
});
```

### 2. Event Booking API (T083)
Add to `src/pages/api/events/book.ts`:
```typescript
import { notifyAdminsNewBooking } from '@/lib/twilio';

// After successful booking
await notifyAdminsNewBooking({
  bookingId: booking.id,
  eventTitle: event.title,
  customerName: user.name,
  customerEmail: user.email,
  numberOfTickets: booking.tickets,
  totalAmount: booking.total_amount,
  eventDate: event.date
});
```

### 3. Inventory Management
Add to stock update logic:
```typescript
import { notifyAdminsLowStock } from '@/lib/twilio';

if (product.stock <= product.low_stock_threshold) {
  await notifyAdminsLowStock({
    productId: product.id,
    productTitle: product.title,
    currentStock: product.stock,
    threshold: product.low_stock_threshold
  });
}
```

### 4. Event Capacity Monitoring
Add to booking logic:
```typescript
import { notifyAdminsEventCapacity } from '@/lib/twilio';

const percentageFull = (event.booked_seats / event.capacity) * 100;

if (percentageFull >= 75) {
  await notifyAdminsEventCapacity({
    eventId: event.id,
    eventTitle: event.title,
    bookedSeats: event.booked_seats,
    totalCapacity: event.capacity,
    percentageFull
  });
}
```

---

## Error Handling

### Graceful Degradation
- If Twilio fails, application continues normally
- Notifications are logged but don't block operations
- Returns `null` on failure instead of throwing errors

### Logging Strategy
```typescript
// Success
console.log(`WhatsApp message sent successfully: ${result.sid}`);

// Retry attempt
console.error(`WhatsApp message send attempt ${attempt}/${retries} failed:`, error);

// Final failure
console.error(`Failed to send WhatsApp message after ${retries} attempts:`, lastError);

// Configuration warnings
console.warn('No admin WhatsApp numbers configured');
console.error('Twilio WhatsApp sender number not configured');
```

### Error Types Handled
1. **Missing Configuration**: Throws clear error message
2. **Invalid Phone Numbers**: Returns `null`, logs error
3. **Network Issues**: Retries with exponential backoff
4. **Twilio API Errors**: Logs error, returns `null`
5. **Missing Admin Numbers**: Logs warning, returns empty array

---

## Performance Considerations

### Async/Await Pattern
All functions are async to prevent blocking:
```typescript
// Non-blocking - returns immediately
const promise = notifyAdminsNewOrder(orderData);

// Can continue processing without waiting
// Message sends in background
```

### Parallel Bulk Messaging
```typescript
// Sends to all admins simultaneously
await Promise.all(
  recipients.map(recipient => sendWhatsAppMessage(recipient, message))
);
```

### Exponential Backoff
Prevents API rate limiting:
- First retry: 2 seconds
- Second retry: 4 seconds  
- Third retry: 8 seconds (if configured)

---

## Security Considerations

### 1. Credential Protection
- Never commit `.env` file
- Use environment variables for all secrets
- Rotate credentials regularly
- Use separate credentials for development/production

### 2. Phone Number Validation
- Format validation before sending
- Prevent SMS/WhatsApp spam
- Consider rate limiting on notification functions

### 3. Message Content
- Sanitize user input in notifications
- Limit message length (Twilio limit: 1600 characters)
- Don't include sensitive data (passwords, tokens)

### 4. Admin Number Management
- Store admin numbers securely
- Verify numbers before adding to list
- Implement admin number management UI

---

## Future Enhancements

1. **Message Templates**
   - Store templates in database
   - Support template variables
   - Multilingual templates

2. **Message History**
   - Store sent messages in database
   - Track delivery status via webhooks
   - Admin dashboard for message history

3. **Notification Preferences**
   - Per-admin notification settings
   - Quiet hours configuration
   - Notification priority levels

4. **Rich Media Support**
   - Attach order receipts as PDF
   - Event location maps
   - Product images

5. **Two-Way Communication**
   - Handle incoming WhatsApp messages
   - Admin replies via platform
   - Customer support integration

6. **Analytics**
   - Delivery rates
   - Response times
   - Message engagement metrics

7. **Batch Notifications**
   - Queue messages for batch sending
   - Scheduled notifications
   - Digest messages (daily summary)

---

## Dependencies

- **twilio**: ^5.10.4 (already installed)
- Node.js built-in modules: none
- External APIs: Twilio WhatsApp API

---

## Lessons Learned

1. **Twilio WhatsApp Sandbox**: For development, use Twilio Sandbox. Production requires WhatsApp Business API approval.

2. **Phone Number Format**: Always use E.164 format with `whatsapp:` prefix. The library handles this automatically.

3. **Retry Logic**: Essential for reliability. Network issues are common, exponential backoff prevents API hammering.

4. **Graceful Degradation**: Never let notification failures break core functionality. Log and continue.

5. **Bulk Messaging**: Use `Promise.all()` for parallel execution, much faster than sequential.

6. **Configuration Verification**: Always verify configuration at startup to catch issues early.

7. **Test Environment**: Use separate test numbers or Twilio Sandbox to avoid spamming real admins during testing.

8. **Message Formatting**: Use emojis and formatting (*bold*, _italic_) to make messages more readable.

9. **Error Messages**: Provide clear, actionable error messages for configuration issues.

10. **Documentation**: Comprehensive comments and type definitions make integration easier.

---

## Related Files

- `src/lib/twilio.ts` - Main implementation
- `tests/e2e/T073_twilio_whatsapp.spec.ts` - Test suite
- `.env.example` - Configuration template
- `package.json` - Dependency management

---

## Completion Checklist

- [x] Twilio client initialization
- [x] Basic message sending with retry
- [x] Bulk messaging support
- [x] New order notifications
- [x] Event booking notifications
- [x] Low stock alerts
- [x] Event capacity alerts
- [x] Custom notifications
- [x] Configuration verification
- [x] Error handling
- [x] Phone number formatting
- [x] Environment variables documentation
- [x] Comprehensive test suite
- [x] Integration examples
- [x] Security considerations
- [x] Implementation log
- [x] Learning guide (next task)

---

**Task Status**: ✅ Complete  
**Next Task**: T074 - Add admin email + WhatsApp notification on new order in webhook handler
