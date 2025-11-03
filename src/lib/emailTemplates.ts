/**
 * T174: Multilingual Email Templates
 *
 * Provides locale-aware email template generation for transactional emails.
 * Supports English and Spanish translations.
 */

import { t, formatCurrency as formatCurrencyI18n, formatDate, type Locale } from '@/i18n';
import { formatCurrency } from './currencyFormat';
import { formatDateLong } from './dateTimeFormat';

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
 * Generate multilingual order confirmation email template
 *
 * @param data - Order data
 * @param locale - Target locale for email
 * @returns Email template with subject, HTML, and text
 */
export function generateOrderConfirmationEmail(
  data: OrderConfirmationData,
  locale: Locale = 'en'
): { subject: string; html: string; text: string } {
  const translate = (key: string, vars?: Record<string, string | number>) => t(locale, key, vars);

  const subject = translate('email.orderConfirmation.subject', { orderId: data.orderId });

  const formattedDate = formatDateLong(data.orderDate, locale);

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
            ${formatCurrency(item.price * (item.quantity || 1), locale)}
          </td>
        </tr>
      `
    )
    .join('');

  const accessLinksHtml = data.accessLinks
    ? `
        <div style="margin-top: 32px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px;">
            ${translate('email.orderConfirmation.accessYourContent')}
          </h3>
          ${data.accessLinks
            .map(
              (link) => `
            <a
              href="${link.url}"
              style="display: inline-block; margin: 8px 8px 8px 0; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;"
            >
              ${translate('email.orderConfirmation.accessButton', { title: link.title })}
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
  <title>${subject}</title>
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
                ${translate('email.orderConfirmation.title')}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${translate('email.orderConfirmation.greeting', { name: data.customerName })}
              </p>

              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${translate('email.orderConfirmation.thankYou')}
              </p>

              <!-- Order Details -->
              <div style="margin: 32px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
                  ${translate('email.orderConfirmation.orderDetails')}
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #6b7280;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.orderConfirmation.orderId')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${data.orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.orderConfirmation.date')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${formattedDate}</td>
                  </tr>
                </table>
              </div>

              <!-- Order Items -->
              <h3 style="margin: 32px 0 16px 0; color: #111827; font-size: 18px;">
                ${translate('email.orderConfirmation.yourOrder')}
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
                ${itemsHtml}
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${translate('email.orderConfirmation.subtotal')}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.subtotal, locale)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${translate('email.orderConfirmation.tax')}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(data.tax, locale)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 700; font-size: 16px;">${translate('email.orderConfirmation.total')}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 700; font-size: 16px;">${formatCurrency(data.total, locale)}</td>
                </tr>
              </table>

              ${accessLinksHtml}

              <!-- Questions -->
              <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #111827; font-weight: 600; font-size: 16px;">
                  ${translate('email.orderConfirmation.questions')}
                </p>
                <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                  ${translate('email.orderConfirmation.contactUs')}
                </p>
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">
                  ${translate('email.orderConfirmation.thankYouFooter')}
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  ${translate('email.orderConfirmation.team')}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                ${translate('email.common.allRightsReserved', { year: new Date().getFullYear() })}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${translate('email.common.sentWith')}
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
${translate('email.orderConfirmation.title')}

${translate('email.orderConfirmation.greeting', { name: data.customerName })}

${translate('email.orderConfirmation.thankYou')}

${translate('email.orderConfirmation.orderDetails')}
${translate('email.orderConfirmation.orderId')}: ${data.orderId}
${translate('email.orderConfirmation.date')}: ${formattedDate}

${translate('email.orderConfirmation.yourOrder')}
${data.items.map(item => `${item.title} - ${formatCurrency(item.price * (item.quantity || 1), locale)}`).join('\n')}

${translate('email.orderConfirmation.subtotal')}: ${formatCurrency(data.subtotal, locale)}
${translate('email.orderConfirmation.tax')}: ${formatCurrency(data.tax, locale)}
${translate('email.orderConfirmation.total')}: ${formatCurrency(data.total, locale)}

${translate('email.orderConfirmation.thankYouFooter')}
${translate('email.orderConfirmation.team')}
  `;

  return { subject, html, text };
}

/**
 * Generate multilingual event booking confirmation email template
 *
 * @param data - Event booking data
 * @param locale - Target locale for email
 * @returns Email template with subject, HTML, and text
 */
export function generateEventBookingEmail(
  data: EventBookingData,
  locale: Locale = 'en'
): { subject: string; html: string; text: string } {
  const translate = (key: string, vars?: Record<string, string | number>) => t(locale, key, vars);

  const subject = translate('email.eventBooking.subject', { eventTitle: data.eventTitle });

  const formattedDate = formatDateLong(data.eventDate, locale);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
                ${translate('email.eventBooking.title')}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${translate('email.eventBooking.greeting', { name: data.customerName })}
              </p>

              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${translate('email.eventBooking.confirmationMessage', { eventTitle: data.eventTitle })}
              </p>

              <!-- Event Details -->
              <div style="margin: 32px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
                  ${translate('email.eventBooking.eventDetails')}
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #6b7280;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.eventBooking.eventTitle')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${data.eventTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.eventBooking.date')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.eventBooking.time')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${data.eventTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.eventBooking.venue')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${data.venue.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.eventBooking.ticketCount')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${data.ticketCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>${translate('email.eventBooking.totalPrice')}:</strong></td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700;">${formatCurrency(data.totalPrice, locale)}</td>
                  </tr>
                </table>
              </div>

              <!-- Venue Address -->
              <div style="margin: 24px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">
                  ${data.venue.name}
                </p>
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  ${data.venue.address}
                </p>
                ${
                  data.venue.mapLink
                    ? `
                <a href="${data.venue.mapLink}" style="display: inline-block; margin-top: 12px; color: #7c3aed; text-decoration: none; font-weight: 600;">
                  ${translate('email.eventBooking.getDirections')} →
                </a>
                `
                    : ''
                }
              </div>

              <!-- Important Info -->
              <div style="margin: 32px 0; padding: 20px; background-color: #eff6ff; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">
                  ${translate('email.eventBooking.importantInfo')}
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                  <li>${translate('email.eventBooking.arriveEarly')}</li>
                  <li>${translate('email.eventBooking.bringTicket', { bookingId: data.bookingId })}</li>
                </ul>
              </div>

              <!-- Footer Message -->
              <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">
                  ${translate('email.eventBooking.lookingForward')}
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  ${translate('email.eventBooking.team')}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                ${translate('email.common.allRightsReserved', { year: new Date().getFullYear() })}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                ${translate('email.common.sentWith')}
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
${translate('email.eventBooking.title')}

${translate('email.eventBooking.greeting', { name: data.customerName })}

${translate('email.eventBooking.confirmationMessage', { eventTitle: data.eventTitle })}

${translate('email.eventBooking.eventDetails')}
${translate('email.eventBooking.eventTitle')}: ${data.eventTitle}
${translate('email.eventBooking.date')}: ${formattedDate}
${translate('email.eventBooking.time')}: ${data.eventTime}
${translate('email.eventBooking.venue')}: ${data.venue.name}
${data.venue.address}
${translate('email.eventBooking.ticketCount')}: ${data.ticketCount}
${translate('email.eventBooking.totalPrice')}: ${formatCurrency(data.totalPrice, locale)}

${translate('email.eventBooking.importantInfo')}
- ${translate('email.eventBooking.arriveEarly')}
- ${translate('email.eventBooking.bringTicket', { bookingId: data.bookingId })}

${translate('email.eventBooking.lookingForward')}
${translate('email.eventBooking.team')}
  `;

  return { subject, html, text };
}
