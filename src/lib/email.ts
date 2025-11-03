/**
 * Email Service - T048
 * 
 * Transactional email service using Resend for sending order confirmations,
 * event bookings, and other notifications.
 * 
 * Features:
 * - Order confirmation emails
 * - Event booking confirmations
 * - User registration/verification emails
 * - Template-based email generation
 * - Error handling and logging
 */

import { Resend } from 'resend';
import { logError } from './errors';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@spiritualityplatform.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Spirituality Platform';
const REPLY_TO = process.env.EMAIL_REPLY_TO || FROM_EMAIL;

/**
 * Email templates interface
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Order confirmation email data
 */
export interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderDate: Date;
  items: Array<{
    type: 'course' | 'product' | 'event';
    title: string;
    price: number;
    quantity?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  accessLinks?: Array<{
    title: string;
    url: string;
  }>;
}

/**
 * Event booking confirmation email data
 */
export interface EventBookingData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  eventDate: Date;
  eventTime: string;
  venue: {
    name: string;
    address: string;
    mapLink?: string;
  };
  ticketCount: number;
  totalPrice: number;
}

/**
 * User registration email data
 */
export interface RegistrationData {
  userName: string;
  userEmail: string;
  verificationLink?: string;
}

/**
 * Internal email sending function using Resend
 */
async function sendEmailInternal(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EMAIL] RESEND_API_KEY not configured, email not sent');
      return { 
        success: false, 
        error: 'Email service not configured' 
      };
    }

    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
      replyTo: REPLY_TO,
    });

    console.log(`[EMAIL] Sent to ${to}: ${subject} (ID: ${result.data?.id})`);
    
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    logError(error, { context: 'sendEmail', to, subject });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Exported sendEmail function with object interface
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmailInternal(options.to, options.subject, options.html, options.text);
}

/**
 * Generate order confirmation email template - T049
 */
function generateOrderConfirmationEmail(data: OrderConfirmationData): EmailTemplate {
  const formattedDate = data.orderDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.title}</strong>
            <br />
            <span style="color: #6b7280; font-size: 14px;">
              ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              ${item.quantity ? ` × ${item.quantity}` : ''}
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            $${(item.price * (item.quantity || 1)).toFixed(2)}
          </td>
        </tr>
      `
    )
    .join('');

  const accessLinksHtml = data.accessLinks
    ? `
        <div style="margin-top: 32px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px;">
            Access Your Content
          </h3>
          ${data.accessLinks
            .map(
              (link) => `
            <a 
              href="${link.url}" 
              style="display: inline-block; margin: 8px 8px 8px 0; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;"
            >
              Access ${link.title}
            </a>
          `
            )
            .join('')}
        </div>
      `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
                Order Confirmed! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.customerName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for your order! We're excited to have you on your spiritual journey with us.
              </p>
              
              <!-- Order Details -->
              <div style="margin: 32px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
                  Order Details
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #6b7280;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${data.orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${formattedDate}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Order Items -->
              <h3 style="margin: 32px 0 16px 0; color: #111827; font-size: 18px;">
                Your Order
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
                ${itemsHtml}
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Subtotal</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${data.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">Tax</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${data.tax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 700; font-size: 18px; color: #7c3aed;">Total</td>
                  <td style="padding: 12px; font-weight: 700; font-size: 18px; color: #7c3aed; text-align: right;">$${data.total.toFixed(2)}</td>
                </tr>
              </table>
              
              ${accessLinksHtml}
              
              <!-- Dashboard Link -->
              <div style="margin-top: 32px; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  💡 You can also access your purchases anytime from your 
                  <a href="${process.env.BASE_URL || 'http://localhost:4321'}/dashboard" style="color: #2563eb; text-decoration: none; font-weight: 600;">
                    dashboard
                  </a>
                </p>
              </div>
              
              <!-- Footer -->
              <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions, feel free to reply to this email.
                <br />
                <br />
                With gratitude,
                <br />
                <strong>The Spirituality Platform Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
                <br />
                <a href="${process.env.BASE_URL || 'http://localhost:4321'}" style="color: #7c3aed; text-decoration: none;">
                  Visit our website
                </a>
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

  // Plain text version
  const text = `
Order Confirmation - ${FROM_NAME}

Hi ${data.customerName},

Thank you for your order! We're excited to have you on your spiritual journey with us.

Order Details:
Order ID: ${data.orderId}
Date: ${formattedDate}

Your Order:
${data.items.map((item) => `- ${item.title} (${item.type}) - $${(item.price * (item.quantity || 1)).toFixed(2)}`).join('\n')}

Subtotal: $${data.subtotal.toFixed(2)}
Tax: $${data.tax.toFixed(2)}
Total: $${data.total.toFixed(2)}

${data.accessLinks ? `\nAccess Your Content:\n${data.accessLinks.map((link) => `${link.title}: ${link.url}`).join('\n')}` : ''}

You can also access your purchases anytime from your dashboard:
${process.env.BASE_URL || 'http://localhost:4321'}/dashboard

If you have any questions, feel free to reply to this email.

With gratitude,
The Spirituality Platform Team

© ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
  `.trim();

  return {
    subject: `Order Confirmation - Order #${data.orderId}`,
    html,
    text,
  };
}

/**
 * Generate event booking confirmation email template
 */
function generateEventBookingEmail(data: EventBookingData): EmailTemplate {
  const formattedDate = data.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mapLinkHtml = data.venue.mapLink
    ? `
        <a 
          href="${data.venue.mapLink}" 
          style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;"
        >
          📍 View on Map
        </a>
      `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
                Event Booking Confirmed! 🎫
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.customerName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your booking for <strong>${data.eventTitle}</strong> has been confirmed! We look forward to seeing you there.
              </p>
              
              <!-- Event Details -->
              <div style="margin: 32px 0; padding: 24px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <h2 style="margin: 0 0 16px 0; color: #92400e; font-size: 20px;">
                  Event Details
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px; color: #78350f;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>📅 Date:</strong></td>
                    <td style="padding: 8px 0;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>🕐 Time:</strong></td>
                    <td style="padding: 8px 0;">${data.eventTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>📍 Venue:</strong></td>
                    <td style="padding: 8px 0;">${data.venue.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>🎫 Tickets:</strong></td>
                    <td style="padding: 8px 0;">${data.ticketCount}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Venue Address -->
              <div style="margin: 32px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">
                  Venue Location
                </h3>
                <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
                  ${data.venue.address}
                </p>
                ${mapLinkHtml}
              </div>
              
              <!-- Booking Reference -->
              <div style="margin: 32px 0; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  💡 <strong>Booking ID:</strong> ${data.bookingId}
                  <br />
                  Please keep this email as your confirmation. You may be asked to present it at the event.
                </p>
              </div>
              
              <!-- Footer -->
              <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you need to make any changes to your booking or have questions, please reply to this email.
                <br />
                <br />
                We can't wait to see you!
                <br />
                <strong>The Spirituality Platform Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
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

  const text = `
Event Booking Confirmation - ${FROM_NAME}

Hi ${data.customerName},

Your booking for ${data.eventTitle} has been confirmed! We look forward to seeing you there.

Event Details:
Date: ${formattedDate}
Time: ${data.eventTime}
Venue: ${data.venue.name}
Tickets: ${data.ticketCount}

Venue Location:
${data.venue.address}
${data.venue.mapLink ? `Map: ${data.venue.mapLink}` : ''}

Booking ID: ${data.bookingId}

Please keep this email as your confirmation. You may be asked to present it at the event.

If you need to make any changes to your booking or have questions, please reply to this email.

We can't wait to see you!
The Spirituality Platform Team

© ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
  `.trim();

  return {
    subject: `Event Booking Confirmed - ${data.eventTitle}`,
    html,
    text,
  };
}

/**
 * Generate user registration/welcome email template
 */
function generateRegistrationEmail(data: RegistrationData): EmailTemplate {
  const verificationHtml = data.verificationLink
    ? `
        <div style="margin: 32px 0; text-align: center;">
          <a 
            href="${data.verificationLink}" 
            style="display: inline-block; padding: 16px 32px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"
          >
            Verify Your Email
          </a>
        </div>
        
        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
          Or copy and paste this link into your browser:
          <br />
          <a href="${data.verificationLink}" style="color: #7c3aed; word-break: break-all;">
            ${data.verificationLink}
          </a>
        </p>
      `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Spirituality Platform</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
                Welcome! 🙏
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.userName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Welcome to Spirituality Platform! We're thrilled to have you join our community of spiritual seekers and practitioners.
              </p>
              
              ${verificationHtml}
              
              <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 8px;">
                <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
                  What's Next?
                </h2>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
                  <li>Browse our collection of spiritual courses and workshops</li>
                  <li>Discover upcoming events in your area</li>
                  <li>Download digital resources to support your journey</li>
                  <li>Connect with our community of like-minded individuals</li>
                </ul>
              </div>
              
              <div style="margin: 32px 0; text-align: center;">
                <a 
                  href="${process.env.BASE_URL || 'http://localhost:4321'}/courses" 
                  style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 8px;"
                >
                  Browse Courses
                </a>
                <a 
                  href="${process.env.BASE_URL || 'http://localhost:4321'}/events" 
                  style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 8px;"
                >
                  View Events
                </a>
              </div>
              
              <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions, we're here to help. Just reply to this email.
                <br />
                <br />
                Wishing you peace and growth on your journey,
                <br />
                <strong>The Spirituality Platform Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
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

  const text = `
Welcome to Spirituality Platform!

Hi ${data.userName},

Welcome to Spirituality Platform! We're thrilled to have you join our community of spiritual seekers and practitioners.

${data.verificationLink ? `Please verify your email address by clicking this link:\n${data.verificationLink}\n\n` : ''}

What's Next?
- Browse our collection of spiritual courses and workshops
- Discover upcoming events in your area
- Download digital resources to support your journey
- Connect with our community of like-minded individuals

Explore our platform:
Courses: ${process.env.BASE_URL || 'http://localhost:4321'}/courses
Events: ${process.env.BASE_URL || 'http://localhost:4321'}/events

If you have any questions, we're here to help. Just reply to this email.

Wishing you peace and growth on your journey,
The Spirituality Platform Team

© ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
  `.trim();

  return {
    subject: `Welcome to ${FROM_NAME}!`,
    html,
    text,
  };
}

/**
 * Send order confirmation email - T049
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = generateOrderConfirmationEmail(data);
  return sendEmailInternal(data.customerEmail, template.subject, template.html, template.text);
}

/**
 * Send event booking confirmation email
 */
export async function sendEventBookingEmail(
  data: EventBookingData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = generateEventBookingEmail(data);
  return sendEmailInternal(data.customerEmail, template.subject, template.html, template.text);
}

/**
 * Send registration/welcome email
 */
export async function sendRegistrationEmail(
  data: RegistrationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = generateRegistrationEmail(data);
  return sendEmailInternal(data.userEmail, template.subject, template.html, template.text);
}

/**
 * Review approval email data - T120
 */
export interface ReviewApprovalData {
  userName: string;
  userEmail: string;
  courseTitle: string;
  rating: number;
  comment: string | null;
  reviewUrl: string;
}

/**
 * Review rejection email data - T120
 */
export interface ReviewRejectionData {
  userName: string;
  userEmail: string;
  courseTitle: string;
  rating: number;
  comment: string | null;
}

/**
 * Generate review approval email template - T120
 */
function generateReviewApprovalEmail(data: ReviewApprovalData): EmailTemplate {
  const stars = '⭐'.repeat(data.rating);
  const commentHtml = data.comment
    ? `
        <div style="margin: 24px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #7c3aed; border-radius: 4px; font-style: italic; color: #374151;">
          "${data.comment}"
        </div>
      `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
                Your Review is Live! ✅
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.userName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your review for <strong>${data.courseTitle}</strong> has been approved and is now visible to our community.
              </p>
              
              <!-- Review Preview -->
              <div style="margin: 32px 0; padding: 24px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                <h2 style="margin: 0 0 12px 0; color: #065f46; font-size: 18px;">
                  Your ${data.rating}-Star Review
                </h2>
                <div style="margin: 12px 0; font-size: 20px; color: #f59e0b;">
                  ${stars}
                </div>
                ${commentHtml}
              </div>
              
              <p style="margin: 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for sharing your experience! Your feedback helps others in our community make informed decisions about their spiritual journey.
              </p>
              
              <!-- CTA Button -->
              <div style="margin: 32px 0; text-align: center;">
                <a 
                  href="${data.reviewUrl}" 
                  style="display: inline-block; padding: 16px 32px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"
                >
                  View Your Published Review
                </a>
              </div>
              
              <!-- Community Impact -->
              <div style="margin: 32px 0; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  💡 <strong>Did you know?</strong> Reviews like yours help over 1,000 spiritual seekers each month find the right courses for their journey.
                </p>
              </div>
              
              <!-- Footer -->
              <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                We appreciate your contribution to our community!
                <br />
                <br />
                With gratitude,
                <br />
                <strong>The Spirituality Platform Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
                <br />
                <a href="${process.env.BASE_URL || 'http://localhost:4321'}" style="color: #7c3aed; text-decoration: none;">
                  Visit our website
                </a>
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

  const text = `
Your Review is Live!

Hi ${data.userName},

Great news! Your review for ${data.courseTitle} has been approved and is now visible to our community.

Your ${data.rating}-Star Review:
${stars}
${data.comment ? `\n"${data.comment}"\n` : ''}

Thank you for sharing your experience! Your feedback helps others in our community make informed decisions about their spiritual journey.

View your published review:
${data.reviewUrl}

Did you know? Reviews like yours help over 1,000 spiritual seekers each month find the right courses for their journey.

We appreciate your contribution to our community!

With gratitude,
The Spirituality Platform Team

© ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
  `.trim();

  return {
    subject: `✅ Your review of "${data.courseTitle}" is now live!`,
    html,
    text,
  };
}

/**
 * Generate review rejection email template - T120
 */
function generateReviewRejectionEmail(data: ReviewRejectionData): EmailTemplate {
  const stars = '⭐'.repeat(data.rating);
  const commentHtml = data.comment
    ? `
        <div style="margin: 16px 0; padding: 16px; background-color: #f9fafb; border-left: 3px solid #d1d5db; border-radius: 4px; font-style: italic; color: #6b7280; font-size: 14px;">
          "${data.comment}"
        </div>
      `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
                Review Update
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${data.userName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for taking the time to review <strong>${data.courseTitle}</strong>. After careful consideration, our moderation team has determined that your review doesn't meet our community guidelines at this time.
              </p>
              
              <!-- Review Details -->
              <div style="margin: 32px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid #9ca3af; border-radius: 4px;">
                <h2 style="margin: 0 0 12px 0; color: #374151; font-size: 18px;">
                  Your ${data.rating}-Star Review
                </h2>
                <div style="margin: 8px 0; font-size: 18px; color: #f59e0b;">
                  ${stars}
                </div>
                ${commentHtml}
              </div>
              
              <!-- Guidelines -->
              <div style="margin: 32px 0; padding: 24px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <h3 style="margin: 0 0 16px 0; color: #92400e; font-size: 18px;">
                  📋 Our Review Guidelines
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                  <li>Reviews should be based on personal experience with the course</li>
                  <li>Keep feedback constructive and respectful</li>
                  <li>Avoid profanity, personal attacks, or discriminatory language</li>
                  <li>Focus on course content, teaching quality, and value</li>
                  <li>Don't include spam, promotional content, or external links</li>
                </ul>
              </div>
              
              <p style="margin: 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                We encourage you to submit a new review that follows our guidelines. Your genuine feedback is valuable to our community and helps others make informed decisions.
              </p>
              
              <!-- CTA Button -->
              <div style="margin: 32px 0; text-align: center;">
                <a 
                  href="${process.env.BASE_URL || 'http://localhost:4321'}/courses" 
                  style="display: inline-block; padding: 16px 32px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;"
                >
                  Browse Our Courses
                </a>
              </div>
              
              <!-- Support -->
              <div style="margin: 32px 0; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  💬 <strong>Questions about this decision?</strong>
                  <br />
                  Our support team is here to help. Reply to this email and we'll be happy to discuss our moderation decision.
                </p>
              </div>
              
              <!-- Footer -->
              <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Thank you for being part of our community.
                <br />
                <br />
                With respect,
                <br />
                <strong>The Spirituality Platform Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
                <br />
                <a href="${process.env.BASE_URL || 'http://localhost:4321'}" style="color: #7c3aed; text-decoration: none;">
                  Visit our website
                </a>
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

  const text = `
Review Update

Hi ${data.userName},

Thank you for taking the time to review ${data.courseTitle}. After careful consideration, our moderation team has determined that your review doesn't meet our community guidelines at this time.

Your ${data.rating}-Star Review:
${stars}
${data.comment ? `\n"${data.comment}"\n` : ''}

Our Review Guidelines:
- Reviews should be based on personal experience with the course
- Keep feedback constructive and respectful
- Avoid profanity, personal attacks, or discriminatory language
- Focus on course content, teaching quality, and value
- Don't include spam, promotional content, or external links

We encourage you to submit a new review that follows our guidelines. Your genuine feedback is valuable to our community and helps others make informed decisions.

Browse our courses:
${process.env.BASE_URL || 'http://localhost:4321'}/courses

Questions about this decision?
Our support team is here to help. Reply to this email and we'll be happy to discuss our moderation decision.

Thank you for being part of our community.

With respect,
The Spirituality Platform Team

© ${new Date().getFullYear()} Spirituality Platform. All rights reserved.
  `.trim();

  return {
    subject: `Review Update: ${data.courseTitle}`,
    html,
    text,
  };
}

/**
 * Send review approval email - T120
 */
export async function sendReviewApprovalEmail(
  data: ReviewApprovalData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = generateReviewApprovalEmail(data);
  return sendEmailInternal(data.userEmail, template.subject, template.html, template.text);
}

/**
 * Send review rejection email - T120
 */
export async function sendReviewRejectionEmail(
  data: ReviewRejectionData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = generateReviewRejectionEmail(data);
  return sendEmailInternal(data.userEmail, template.subject, template.html, template.text);
}

/**
 * Verify email service configuration
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
