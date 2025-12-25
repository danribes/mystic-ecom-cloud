/**
 * Twilio WhatsApp Integration
 *
 * Cloudflare Workers compatible version using Twilio REST API via fetch().
 * The Twilio SDK is not compatible with Cloudflare Workers runtime.
 */

// Environment variables - use import.meta.env for Astro compatibility
const TWILIO_ACCOUNT_SID = import.meta.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = import.meta.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = import.meta.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_FROM;
const ADMIN_WHATSAPP_NUMBERS = (import.meta.env.ADMIN_WHATSAPP_NUMBERS || process.env.ADMIN_WHATSAPP_NUMBERS)?.split(',') || [];

/**
 * Send WhatsApp message via Twilio REST API
 * Uses fetch() which is available in Cloudflare Workers
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  options: { retries?: number; mediaUrl?: string[] } = {}
): Promise<string | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.warn('[Twilio] Credentials not configured - WhatsApp message not sent');
    return null;
  }

  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const formattedFrom = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: formattedFrom,
          Body: message,
          ...(options.mediaUrl && options.mediaUrl.length > 0 ? { MediaUrl: options.mediaUrl[0] } : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Twilio] API error:', response.status, errorData);
      return null;
    }

    const result = await response.json() as { sid: string };
    console.log(`[Twilio] WhatsApp message sent: ${result.sid}`);
    return result.sid;
  } catch (error) {
    console.error('[Twilio] Failed to send WhatsApp message:', error);
    return null;
  }
}

/**
 * Send WhatsApp message to multiple recipients
 */
export async function sendBulkWhatsAppMessages(
  recipients: string[],
  message: string,
  options: { mediaUrl?: string[] } = {}
): Promise<(string | null)[]> {
  const results = await Promise.all(
    recipients.map((recipient) => sendWhatsAppMessage(recipient, message, options))
  );
  return results;
}

/**
 * Send new order notification to admins
 */
export async function notifyAdminsNewOrder(orderData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{ title: string; quantity: number; price: number }>;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('[Twilio] No admin WhatsApp numbers configured');
    return [];
  }

  const { orderId, customerName, customerEmail, totalAmount, items } = orderData;

  const itemsList = items
    .map((item) => `• ${item.title} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');

  const message = `🛒 *New Order Received!*

Order ID: ${orderId}
Customer: ${customerName}
Email: ${customerEmail}

*Items:*
${itemsList}

*Total: $${totalAmount.toFixed(2)}*

View details in admin dashboard.`;

  return sendBulkWhatsAppMessages(ADMIN_WHATSAPP_NUMBERS, message);
}

/**
 * Send event booking notification to admins
 */
export async function notifyAdminsNewBooking(bookingData: {
  bookingId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  numberOfTickets: number;
  totalAmount: number;
  eventDate: Date;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('[Twilio] No admin WhatsApp numbers configured');
    return [];
  }

  const { bookingId, eventTitle, customerName, customerEmail, numberOfTickets, totalAmount, eventDate } =
    bookingData;

  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `📅 *New Event Booking!*

Booking ID: ${bookingId}
Event: ${eventTitle}
Date: ${formattedDate}

Customer: ${customerName}
Email: ${customerEmail}
Tickets: ${numberOfTickets}

*Total: $${totalAmount.toFixed(2)}*

View details in admin dashboard.`;

  return sendBulkWhatsAppMessages(ADMIN_WHATSAPP_NUMBERS, message);
}

/**
 * Send low stock alert to admins
 */
export async function notifyAdminsLowStock(productData: {
  productId: string;
  productTitle: string;
  currentStock: number;
  threshold: number;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('[Twilio] No admin WhatsApp numbers configured');
    return [];
  }

  const { productId, productTitle, currentStock, threshold } = productData;

  const message = `⚠️ *Low Stock Alert!*

Product: ${productTitle}
ID: ${productId}

Current Stock: ${currentStock}
Threshold: ${threshold}

Please restock soon.`;

  return sendBulkWhatsAppMessages(ADMIN_WHATSAPP_NUMBERS, message);
}

/**
 * Send event capacity alert to admins
 */
export async function notifyAdminsEventCapacity(eventData: {
  eventId: string;
  eventTitle: string;
  bookedSeats: number;
  totalCapacity: number;
  percentageFull: number;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('[Twilio] No admin WhatsApp numbers configured');
    return [];
  }

  const { eventId, eventTitle, bookedSeats, totalCapacity, percentageFull } = eventData;

  const message = `🎫 *Event Capacity Alert!*

Event: ${eventTitle}
ID: ${eventId}

Booked: ${bookedSeats}/${totalCapacity} seats
Capacity: ${percentageFull.toFixed(1)}% full

${percentageFull >= 90 ? '⚠️ Event almost full!' : ''}`;

  return sendBulkWhatsAppMessages(ADMIN_WHATSAPP_NUMBERS, message);
}

/**
 * Send custom notification to admins
 */
export async function notifyAdminsCustom(
  title: string,
  message: string,
  mediaUrl?: string[]
) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('[Twilio] No admin WhatsApp numbers configured');
    return [];
  }

  const formattedMessage = `📢 *${title}*\n\n${message}`;

  return sendBulkWhatsAppMessages(ADMIN_WHATSAPP_NUMBERS, formattedMessage, { mediaUrl });
}

/**
 * Verify Twilio configuration
 */
export function verifyTwilioConfig(): boolean {
  return !!(
    TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_WHATSAPP_FROM &&
    ADMIN_WHATSAPP_NUMBERS.length > 0
  );
}
