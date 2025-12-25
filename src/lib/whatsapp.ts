/**
 * WhatsApp Service - T073-T074
 *
 * WhatsApp notification service using Twilio REST API via fetch().
 * Cloudflare Workers compatible - does not use the Twilio SDK.
 *
 * Features:
 * - Order confirmation messages to customers
 * - Event booking confirmations to customers
 * - Admin notifications for new orders
 * - Template-based message generation
 * - Error handling and logging
 */

import { logError } from './errors';

// WhatsApp configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const ADMIN_WHATSAPP = process.env.TWILIO_ADMIN_WHATSAPP || process.env.ADMIN_WHATSAPP;

/**
 * WhatsApp message result
 */
export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Order confirmation WhatsApp data
 */
export interface OrderWhatsAppData {
  orderId: string;
  customerName: string;
  customerPhone: string; // Must be in E.164 format: +1234567890
  items: Array<{
    title: string;
    price: number;
  }>;
  total: number;
  dashboardUrl?: string;
}

/**
 * Event booking WhatsApp data
 */
export interface EventWhatsAppData {
  bookingId: string;
  customerName: string;
  customerPhone: string; // Must be in E.164 format: +1234567890
  eventTitle: string;
  eventDate: Date;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  ticketCount: number;
}

/**
 * Admin notification data
 */
export interface AdminNotificationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  itemCount: number;
  orderDate: Date;
}

/**
 * Format phone number to WhatsApp format (whatsapp:+1234567890)
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove any existing "whatsapp:" prefix
  let cleanPhone = phone.replace(/^whatsapp:/i, '').trim();

  // Ensure it starts with +
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone;
  }

  return `whatsapp:${cleanPhone}`;
}

/**
 * Send WhatsApp message using Twilio REST API
 */
async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<WhatsAppResult> {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn('[WHATSAPP] Twilio not configured, message not sent');
      return {
        success: false,
        error: 'WhatsApp service not configured',
      };
    }

    const formattedTo = formatWhatsAppNumber(to);
    const formattedFrom = WHATSAPP_FROM.startsWith('whatsapp:')
      ? WHATSAPP_FROM
      : `whatsapp:${WHATSAPP_FROM}`;

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
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[WHATSAPP] Twilio API error:', response.status, errorData);
      return {
        success: false,
        error: `Twilio API error: ${response.status}`,
      };
    }

    const result = await response.json() as { sid: string };
    console.log(`[WHATSAPP] Sent to ${formattedTo} (SID: ${result.sid})`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    logError(error, { context: 'sendWhatsAppMessage', to });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Reset client (no-op in fetch-based implementation, kept for compatibility)
export function resetTwilioClient() {
  // No-op - fetch-based implementation doesn't cache clients
}

/**
 * Generate order confirmation WhatsApp message
 */
function generateOrderWhatsAppMessage(data: OrderWhatsAppData): string {
  const itemsList = data.items
    .map((item, index) => `${index + 1}. ${item.title} - $${item.price.toFixed(2)}`)
    .join('\n');

  const dashboardLink = data.dashboardUrl
    ? `\n\n🔗 Access your purchases:\n${data.dashboardUrl}`
    : '';

  return `
🎉 *Order Confirmed!*

Hi ${data.customerName}!

Thank you for your order.

📋 *Order #${data.orderId}*

${itemsList}

💰 *Total:* $${data.total.toFixed(2)}
${dashboardLink}

If you have any questions, reply to this message.

_Spirituality Platform_
  `.trim();
}

/**
 * Generate event booking WhatsApp message
 */
function generateEventWhatsAppMessage(data: EventWhatsAppData): string {
  const formattedDate = data.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
🎫 *Event Booking Confirmed!*

Hi ${data.customerName}!

Your booking for *${data.eventTitle}* is confirmed.

📅 *Date:* ${formattedDate}
🕐 *Time:* ${data.eventTime}
📍 *Venue:* ${data.venueName}
${data.venueAddress}

🎟️ *Tickets:* ${data.ticketCount}
🔖 *Booking ID:* ${data.bookingId}

Please save this message as your confirmation. See you there!

_Spirituality Platform_
  `.trim();
}

/**
 * Generate admin notification message
 */
function generateAdminNotificationMessage(data: AdminNotificationData): string {
  const formattedDate = data.orderDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
🔔 *New Order Received*

📋 Order #${data.orderId}
👤 Customer: ${data.customerName}
📧 Email: ${data.customerEmail}
📦 Items: ${data.itemCount}
💰 Total: $${data.total.toFixed(2)}
🕐 ${formattedDate}

Check admin dashboard for details.
  `.trim();
}

/**
 * Send order confirmation WhatsApp message to customer
 */
export async function sendOrderWhatsApp(
  data: OrderWhatsAppData
): Promise<WhatsAppResult> {
  const message = generateOrderWhatsAppMessage(data);
  return sendWhatsAppMessage(data.customerPhone, message);
}

/**
 * Send event booking confirmation WhatsApp message to customer
 */
export async function sendEventBookingWhatsApp(
  data: EventWhatsAppData
): Promise<WhatsAppResult> {
  const message = generateEventWhatsAppMessage(data);
  return sendWhatsAppMessage(data.customerPhone, message);
}

/**
 * Send admin notification for new order - T074
 */
export async function sendAdminOrderNotification(
  data: AdminNotificationData
): Promise<WhatsAppResult> {
  const adminWhatsApp = process.env.ADMIN_WHATSAPP || process.env.TWILIO_ADMIN_WHATSAPP;

  if (!adminWhatsApp) {
    console.warn('[WHATSAPP] Admin WhatsApp number not configured');
    return {
      success: false,
      error: 'Admin WhatsApp not configured',
    };
  }

  const message = generateAdminNotificationMessage(data);
  return sendWhatsAppMessage(adminWhatsApp, message);
}

/**
 * Send both email and WhatsApp notification (convenience function)
 */
export async function sendOrderNotifications(
  emailData: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    orderDate: Date;
    items: Array<{ type: 'course' | 'product' | 'event'; title: string; price: number; quantity?: number }>;
    subtotal: number;
    tax: number;
    total: number;
    accessLinks?: Array<{ title: string; url: string }>;
  },
  whatsappData: {
    customerPhone?: string;
    dashboardUrl?: string;
  }
): Promise<{
  email: { success: boolean; messageId?: string; error?: string };
  whatsapp: { success: boolean; messageId?: string; error?: string };
  adminWhatsapp: { success: boolean; messageId?: string; error?: string };
}> {
  const { sendOrderConfirmationEmail } = await import('./email');

  // Send email
  const emailResult = await sendOrderConfirmationEmail(emailData);

  // Send WhatsApp to customer if phone provided
  let whatsappResult: WhatsAppResult = { success: false, error: 'No phone provided' };
  if (whatsappData.customerPhone) {
    const whatsappOrderData: OrderWhatsAppData = {
      orderId: emailData.orderId,
      customerName: emailData.customerName,
      customerPhone: whatsappData.customerPhone,
      items: emailData.items.map((item) => ({
        title: item.title,
        price: item.price * (item.quantity || 1),
      })),
      total: emailData.total,
      dashboardUrl: whatsappData.dashboardUrl,
    };
    whatsappResult = await sendOrderWhatsApp(whatsappOrderData);
  }

  // Send admin notification
  const adminNotificationData: AdminNotificationData = {
    orderId: emailData.orderId,
    customerName: emailData.customerName,
    customerEmail: emailData.customerEmail,
    total: emailData.total,
    itemCount: emailData.items.length,
    orderDate: emailData.orderDate,
  };
  const adminWhatsappResult = await sendAdminOrderNotification(adminNotificationData);

  return {
    email: emailResult,
    whatsapp: whatsappResult,
    adminWhatsapp: adminWhatsappResult,
  };
}

/**
 * Send both email and WhatsApp for event booking
 */
export async function sendEventBookingNotifications(
  emailData: {
    bookingId: string;
    customerName: string;
    customerEmail: string;
    eventTitle: string;
    eventDate: Date;
    eventTime: string;
    venue: { name: string; address: string; mapLink?: string };
    ticketCount: number;
    totalPrice: number;
  },
  customerPhone?: string
): Promise<{
  email: { success: boolean; messageId?: string; error?: string };
  whatsapp: { success: boolean; messageId?: string; error?: string };
}> {
  const { sendEventBookingEmail } = await import('./email');

  // Send email
  const emailResult = await sendEventBookingEmail(emailData);

  // Send WhatsApp if phone provided
  let whatsappResult: WhatsAppResult = { success: false, error: 'No phone provided' };
  if (customerPhone) {
    const whatsappEventData: EventWhatsAppData = {
      bookingId: emailData.bookingId,
      customerName: emailData.customerName,
      customerPhone: customerPhone,
      eventTitle: emailData.eventTitle,
      eventDate: emailData.eventDate,
      eventTime: emailData.eventTime,
      venueName: emailData.venue.name,
      venueAddress: emailData.venue.address,
      ticketCount: emailData.ticketCount,
    };
    whatsappResult = await sendEventBookingWhatsApp(whatsappEventData);
  }

  return {
    email: emailResult,
    whatsapp: whatsappResult,
  };
}

/**
 * Verify WhatsApp service configuration
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
}

/**
 * Verify admin WhatsApp is configured
 */
export function isAdminWhatsAppConfigured(): boolean {
  const adminWhatsApp = process.env.ADMIN_WHATSAPP || process.env.TWILIO_ADMIN_WHATSAPP;
  return !!(adminWhatsApp && isWhatsAppConfigured());
}
