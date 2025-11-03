/**
 * T174: Multilingual Email Templates Tests
 * Tests for locale-aware email template generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateOrderConfirmationEmail,
  generateEventBookingEmail,
  type OrderConfirmationData,
  type EventBookingData,
} from '@/lib/emailTemplates';

describe('Multilingual Email Templates (T174)', () => {
  const orderData: OrderConfirmationData = {
    orderId: 'ORD-12345',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    orderDate: new Date('2025-11-02T10:00:00Z'),
    items: [
      {
        type: 'course',
        title: 'Quantum Manifestation Mastery',
        price: 199,
        quantity: 1,
      },
      {
        type: 'product',
        title: 'Meditation Guide eBook',
        price: 29.99,
        quantity: 2,
      },
    ],
    subtotal: 258.98,
    tax: 38.85,
    total: 297.83,
    accessLinks: [
      {
        title: 'Quantum Manifestation Mastery',
        url: 'https://example.com/course/quantum',
      },
    ],
  };

  const eventData: EventBookingData = {
    bookingId: 'BKG-67890',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    eventTitle: 'Sacred Geometry Workshop',
    eventDate: new Date('2025-12-15T14:00:00Z'),
    eventTime: '2:00 PM - 5:00 PM',
    venue: {
      name: 'Spiritual Center',
      address: '123 Harmony Lane, San Francisco, CA 94102',
      mapLink: 'https://maps.google.com/?q=Spiritual+Center',
    },
    ticketCount: 2,
    totalPrice: 150,
  };

  describe('generateOrderConfirmationEmail', () => {
    it('should generate English order confirmation email', () => {
      const result = generateOrderConfirmationEmail(orderData, 'en');

      expect(result.subject).toContain('Order Confirmation');
      expect(result.subject).toContain('ORD-12345');
      expect(result.html).toContain('Order Confirmed!');
      expect(result.html).toContain('Hi John Doe,');
      expect(result.html).toContain('Thank you for your order!');
      expect(result.html).toContain('Order Details');
      expect(result.html).toContain('Your Order');
      expect(result.html).toContain('Subtotal');
      expect(result.html).toContain('Tax');
      expect(result.html).toContain('Total');
    });

    it('should generate Spanish order confirmation email', () => {
      const result = generateOrderConfirmationEmail(orderData, 'es');

      expect(result.subject).toContain('Confirmación de Pedido');
      expect(result.subject).toContain('ORD-12345');
      expect(result.html).toContain('¡Pedido Confirmado!');
      expect(result.html).toContain('Hola John Doe,');
      expect(result.html).toContain('¡Gracias por tu pedido!');
      expect(result.html).toContain('Detalles del Pedido');
      expect(result.html).toContain('Tu Pedido');
      expect(result.html).toContain('Subtotal');
      expect(result.html).toContain('Impuesto');
      expect(result.html).toContain('Total');
    });

    it('should include order items in English', () => {
      const result = generateOrderConfirmationEmail(orderData, 'en');

      expect(result.html).toContain('Quantum Manifestation Mastery');
      expect(result.html).toContain('Meditation Guide eBook');
      expect(result.html).toContain('× 2');
    });

    it('should include order items in Spanish', () => {
      const result = generateOrderConfirmationEmail(orderData, 'es');

      expect(result.html).toContain('Quantum Manifestation Mastery');
      expect(result.html).toContain('Meditation Guide eBook');
      expect(result.html).toContain('× 2');
    });

    it('should format prices according to locale', () => {
      const resultEn = generateOrderConfirmationEmail(orderData, 'en');
      const resultEs = generateOrderConfirmationEmail(orderData, 'es');

      // Both should contain currency symbols
      expect(resultEn.html).toMatch(/\$|USD/);
      expect(resultEs.html).toMatch(/\$|MXN/);
    });

    it('should include access links in English', () => {
      const result = generateOrderConfirmationEmail(orderData, 'en');

      expect(result.html).toContain('Access Your Content');
      expect(result.html).toContain('Access Quantum Manifestation Mastery');
      expect(result.html).toContain('https://example.com/course/quantum');
    });

    it('should include access links in Spanish', () => {
      const result = generateOrderConfirmationEmail(orderData, 'es');

      expect(result.html).toContain('Accede a tu Contenido');
      expect(result.html).toContain('Acceder a Quantum Manifestation Mastery');
      expect(result.html).toContain('https://example.com/course/quantum');
    });

    it('should generate plain text version in English', () => {
      const result = generateOrderConfirmationEmail(orderData, 'en');

      expect(result.text).toContain('Order Confirmed!');
      expect(result.text).toContain('Hi John Doe,');
      expect(result.text).toContain('Thank you for your order!');
      expect(result.text).toContain('Order ID: ORD-12345');
    });

    it('should generate plain text version in Spanish', () => {
      const result = generateOrderConfirmationEmail(orderData, 'es');

      expect(result.text).toContain('¡Pedido Confirmado!');
      expect(result.text).toContain('Hola John Doe,');
      expect(result.text).toContain('¡Gracias por tu pedido!');
      expect(result.text).toContain('ID de Pedido: ORD-12345');
    });

    it('should include footer in English', () => {
      const result = generateOrderConfirmationEmail(orderData, 'en');

      expect(result.html).toContain('The Spirituality Platform Team');
      expect(result.html).toMatch(/©.*Spirituality Platform/);
      expect(result.html).toContain('Sent with ❤️');
    });

    it('should include footer in Spanish', () => {
      const result = generateOrderConfirmationEmail(orderData, 'es');

      expect(result.html).toContain('El Equipo de Plataforma de Espiritualidad');
      expect(result.html).toMatch(/©.*Plataforma de Espiritualidad/);
      expect(result.html).toContain('Enviado con ❤️');
    });
  });

  describe('generateEventBookingEmail', () => {
    it('should generate English event booking email', () => {
      const result = generateEventBookingEmail(eventData, 'en');

      expect(result.subject).toContain('Event Booking Confirmation');
      expect(result.subject).toContain('Sacred Geometry Workshop');
      expect(result.html).toContain('Booking Confirmed!');
      expect(result.html).toContain('Hi Jane Smith,');
      expect(result.html).toContain('Your booking for Sacred Geometry Workshop has been confirmed!');
    });

    it('should generate Spanish event booking email', () => {
      const result = generateEventBookingEmail(eventData, 'es');

      expect(result.subject).toContain('Confirmación de Reserva de Evento');
      expect(result.subject).toContain('Sacred Geometry Workshop');
      expect(result.html).toContain('¡Reserva Confirmada!');
      expect(result.html).toContain('Hola Jane Smith,');
      expect(result.html).toContain('¡Tu reserva para Sacred Geometry Workshop ha sido confirmada!');
    });

    it('should include event details in English', () => {
      const result = generateEventBookingEmail(eventData, 'en');

      expect(result.html).toContain('Event Details');
      expect(result.html).toContain('Event:');
      expect(result.html).toContain('Date:');
      expect(result.html).toContain('Time:');
      expect(result.html).toContain('Venue:');
      expect(result.html).toContain('Tickets:');
    });

    it('should include event details in Spanish', () => {
      const result = generateEventBookingEmail(eventData, 'es');

      expect(result.html).toContain('Detalles del Evento');
      expect(result.html).toContain('Evento:');
      expect(result.html).toContain('Fecha:');
      expect(result.html).toContain('Hora:');
      expect(result.html).toContain('Lugar:');
      expect(result.html).toContain('Entradas:');
    });

    it('should include venue information', () => {
      const resultEn = generateEventBookingEmail(eventData, 'en');
      const resultEs = generateEventBookingEmail(eventData, 'es');

      expect(resultEn.html).toContain('Spiritual Center');
      expect(resultEn.html).toContain('123 Harmony Lane, San Francisco, CA 94102');
      expect(resultEs.html).toContain('Spiritual Center');
      expect(resultEs.html).toContain('123 Harmony Lane, San Francisco, CA 94102');
    });

    it('should include directions link in English', () => {
      const result = generateEventBookingEmail(eventData, 'en');

      expect(result.html).toContain('Get Directions');
      expect(result.html).toContain('https://maps.google.com/?q=Spiritual+Center');
    });

    it('should include directions link in Spanish', () => {
      const result = generateEventBookingEmail(eventData, 'es');

      expect(result.html).toContain('Obtener Direcciones');
      expect(result.html).toContain('https://maps.google.com/?q=Spiritual+Center');
    });

    it('should include important info in English', () => {
      const result = generateEventBookingEmail(eventData, 'en');

      expect(result.html).toContain('Important Information');
      expect(result.html).toContain('Please arrive 15 minutes early');
      expect(result.html).toContain('Bring this confirmation email or your booking ID: BKG-67890');
    });

    it('should include important info in Spanish', () => {
      const result = generateEventBookingEmail(eventData, 'es');

      expect(result.html).toContain('Información Importante');
      expect(result.html).toContain('Por favor llega 15 minutos antes');
      expect(result.html).toContain('Trae este correo de confirmación o tu ID de reserva: BKG-67890');
    });

    it('should generate plain text version in English', () => {
      const result = generateEventBookingEmail(eventData, 'en');

      expect(result.text).toContain('Booking Confirmed!');
      expect(result.text).toContain('Hi Jane Smith,');
      expect(result.text).toContain('Sacred Geometry Workshop');
      expect(result.text).toContain('Spiritual Center');
    });

    it('should generate plain text version in Spanish', () => {
      const result = generateEventBookingEmail(eventData, 'es');

      expect(result.text).toContain('¡Reserva Confirmada!');
      expect(result.text).toContain('Hola Jane Smith,');
      expect(result.text).toContain('Sacred Geometry Workshop');
      expect(result.text).toContain('Spiritual Center');
    });
  });

  describe('Type Consistency', () => {
    it('should always return objects with subject, html, and text', () => {
      const order = generateOrderConfirmationEmail(orderData, 'en');
      const event = generateEventBookingEmail(eventData, 'en');

      expect(typeof order.subject).toBe('string');
      expect(typeof order.html).toBe('string');
      expect(typeof order.text).toBe('string');

      expect(typeof event.subject).toBe('string');
      expect(typeof event.html).toBe('string');
      expect(typeof event.text).toBe('string');
    });

    it('should generate non-empty content', () => {
      const order = generateOrderConfirmationEmail(orderData, 'en');
      const event = generateEventBookingEmail(eventData, 'en');

      expect(order.subject.length).toBeGreaterThan(0);
      expect(order.html.length).toBeGreaterThan(100);
      expect(order.text.length).toBeGreaterThan(50);

      expect(event.subject.length).toBeGreaterThan(0);
      expect(event.html.length).toBeGreaterThan(100);
      expect(event.text.length).toBeGreaterThan(50);
    });
  });
});
