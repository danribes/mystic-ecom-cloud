/**
 * Twilio WhatsApp Integration
 * Provides functionality for sending WhatsApp notifications to admins
 */

import twilio from 'twilio';

// Environment variables
const TWILIO_ACCOUNT_SID = import.meta.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = import.meta.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = import.meta.env.TWILIO_WHATSAPP_FROM;
const ADMIN_WHATSAPP_NUMBERS = import.meta.env.ADMIN_WHATSAPP_NUMBERS?.split(',') || [];

// Twilio client initialization
let twilioClient: ReturnType<typeof twilio> | null = null;

/**
 * Initialize Twilio client
 * @returns Twilio client instance
 */
function getTwilioClient() {
  if (!twilioClient) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Send WhatsApp message
 * @param to - Recipient phone number in E.164 format (e.g., whatsapp:+1234567890)
 * @param message - Message content
 * @param options - Additional options
 * @returns Message SID or null if failed
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  options: { retries?: number; mediaUrl?: string[] } = {}
): Promise<string | null> {
  const { retries = 3, mediaUrl } = options;

  if (!TWILIO_WHATSAPP_FROM) {
    console.error('Twilio WhatsApp sender number not configured');
    return null;
  }

  // Ensure phone number is in WhatsApp format
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const formattedFrom = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < retries) {
    try {
      const client = getTwilioClient();
      const messageData: any = {
        body: message,
        from: formattedFrom,
        to: formattedTo,
      };

      if (mediaUrl && mediaUrl.length > 0) {
        messageData.mediaUrl = mediaUrl;
      }

      const result = await client.messages.create(messageData);

      console.log(`WhatsApp message sent successfully: ${result.sid}`);
      return result.sid;
    } catch (error) {
      lastError = error as Error;
      attempt++;
      console.error(
        `WhatsApp message send attempt ${attempt}/${retries} failed:`,
        error
      );

      if (attempt < retries) {
        // Exponential backoff: wait 2^attempt seconds
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error(`Failed to send WhatsApp message after ${retries} attempts:`, lastError);
  return null;
}

/**
 * Send WhatsApp message to multiple recipients
 * @param recipients - Array of phone numbers
 * @param message - Message content
 * @param options - Additional options
 * @returns Array of message SIDs (null for failed messages)
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
 * @param orderData - Order information
 * @returns Array of message SIDs
 */
export async function notifyAdminsNewOrder(orderData: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{ title: string; quantity: number; price: number }>;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('No admin WhatsApp numbers configured');
    return [];
  }

  const { orderId, customerName, customerEmail, totalAmount, items } = orderData;

  // Format items list
  const itemsList = items
    .map(
      (item) =>
        `• ${item.title} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
    )
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
 * @param bookingData - Booking information
 * @returns Array of message SIDs
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
    console.warn('No admin WhatsApp numbers configured');
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
 * @param productData - Product information
 * @returns Array of message SIDs
 */
export async function notifyAdminsLowStock(productData: {
  productId: string;
  productTitle: string;
  currentStock: number;
  threshold: number;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('No admin WhatsApp numbers configured');
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
 * @param eventData - Event information
 * @returns Array of message SIDs
 */
export async function notifyAdminsEventCapacity(eventData: {
  eventId: string;
  eventTitle: string;
  bookedSeats: number;
  totalCapacity: number;
  percentageFull: number;
}) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('No admin WhatsApp numbers configured');
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
 * @param title - Notification title
 * @param message - Notification message
 * @param mediaUrl - Optional media URLs
 * @returns Array of message SIDs
 */
export async function notifyAdminsCustom(
  title: string,
  message: string,
  mediaUrl?: string[]
) {
  if (ADMIN_WHATSAPP_NUMBERS.length === 0) {
    console.warn('No admin WhatsApp numbers configured');
    return [];
  }

  const formattedMessage = `📢 *${title}*\n\n${message}`;

  return sendBulkWhatsAppMessages(ADMIN_WHATSAPP_NUMBERS, formattedMessage, { mediaUrl });
}

/**
 * Verify Twilio configuration
 * @returns true if properly configured, false otherwise
 */
export function verifyTwilioConfig(): boolean {
  return !!(
    TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_WHATSAPP_FROM &&
    ADMIN_WHATSAPP_NUMBERS.length > 0
  );
}
