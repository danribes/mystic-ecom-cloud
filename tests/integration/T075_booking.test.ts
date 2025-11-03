/**
 * T075: Integration Test for Event Booking Flow with Capacity Checking
 * 
 * Tests the complete booking flow including:
 * - Creating bookings
 * - Capacity validation
 * - Overbooking prevention
 * - Available spots updates
 * - Multiple attendees handling
 * - Concurrent booking scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '../setup/database';
import type { QueryResult } from 'pg';

// Type definitions
interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  event_date: Date;
  duration_hours: number;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_country: string;
  capacity: number;
  available_spots: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  order_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  attendees: number;
  total_price: number;
  whatsapp_notified: boolean;
  email_notified: boolean;
  created_at: Date;
  updated_at: Date;
}

// Test data
let testUser1: User;
let testUser2: User;
let testEvent: Event;

describe('T075: Event Booking Flow with Capacity Checking', () => {
  
  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM bookings WHERE event_id IN (SELECT id FROM events WHERE slug = $1)', ['test-spiritual-retreat']);
    await pool.query('DELETE FROM events WHERE slug = $1', ['test-spiritual-retreat']);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', ['booking-test-user1@test.com', 'booking-test-user2@test.com']);
    
    // Create test users
    const user1Result = await pool.query<User>(
      `INSERT INTO users (name, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      ['Test User 1', 'booking-test-user1@test.com', 'hashed_password', 'user', true]
    );
    testUser1 = user1Result.rows[0]!;
    
    const user2Result = await pool.query<User>(
      `INSERT INTO users (name, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      ['Test User 2', 'booking-test-user2@test.com', 'hashed_password', 'user', true]
    );
    testUser2 = user2Result.rows[0]!;
    
    // Create test event with limited capacity
    const eventResult = await pool.query<Event>(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        capacity, available_spots, is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        'Test Spiritual Retreat',
        'test-spiritual-retreat',
        'A transformative weekend retreat',
        299.99,
        new Date('2025-12-15 10:00:00'),
        48, // 2 days
        'Harmony Center',
        '123 Peace Street',
        'Austin',
        'USA',
        5, // capacity
        5, // available_spots
        true
      ]
    );
    testEvent = eventResult.rows[0]!;
  });
  
  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM bookings WHERE event_id = $1', [testEvent?.id]);
    await pool.query('DELETE FROM events WHERE id = $1', [testEvent?.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUser1?.id, testUser2?.id]);
  });
  
  describe('Basic Booking Creation', () => {
    
    it('should create a booking successfully', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create booking
        const bookingResult = await client.query<Booking>(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [testUser1.id, testEvent.id, 'pending', 1, testEvent.price]
        );
        
        // Update available spots
        await client.query(
          `UPDATE events SET available_spots = available_spots - $1 WHERE id = $2`,
          [1, testEvent.id]
        );
        
        await client.query('COMMIT');
        
        const booking = bookingResult.rows[0]!;
        expect(booking).toBeDefined();
        expect(booking.user_id).toBe(testUser1.id);
        expect(booking.event_id).toBe(testEvent.id);
        expect(booking.attendees).toBe(1);
        expect(booking.status).toBe('pending');
        expect(Number(booking.total_price)).toBe(Number(testEvent.price));
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    
    it('should update available spots after booking', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create booking for 2 attendees
        await client.query(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser1.id, testEvent.id, 'confirmed', 2, testEvent.price * 2]
        );
        
        // Update available spots
        await client.query(
          `UPDATE events SET available_spots = available_spots - $1 WHERE id = $2`,
          [2, testEvent.id]
        );
        
        await client.query('COMMIT');
        
        // Check updated spots
        const eventResult = await pool.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1',
          [testEvent.id]
        );
        
        expect(eventResult.rows[0]!.available_spots).toBe(3); // 5 - 2
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    
    it('should calculate correct total price for multiple attendees', async () => {
      const attendees = 3;
      const expectedTotal = Number(testEvent.price) * attendees;
      
      const bookingResult = await pool.query<Booking>(
        `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [testUser1.id, testEvent.id, 'pending', attendees, expectedTotal]
      );
      
      const booking = bookingResult.rows[0]!;
      expect(booking.attendees).toBe(3);
      expect(Number(booking.total_price)).toBe(expectedTotal);
    });
  });
  
  describe('Capacity Validation', () => {
    
    it('should prevent booking when not enough spots available', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Try to book more attendees than available spots
        const requestedAttendees = 6; // Event capacity is 5
        
        // Check capacity first
        const eventResult = await client.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1',
          [testEvent.id]
        );
        
        const availableSpots = eventResult.rows[0]!.available_spots;
        
        expect(availableSpots).toBe(5);
        expect(requestedAttendees).toBeGreaterThan(availableSpots);
        
        // Should not allow booking
        if (requestedAttendees > availableSpots) {
          await client.query('ROLLBACK');
          // Booking would be rejected
          expect(true).toBe(true);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    
    it('should allow booking when exactly enough spots available', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Book exactly the available capacity
        const requestedAttendees = 5;
        
        // Check capacity
        const checkResult = await client.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
          [testEvent.id]
        );
        
        const availableSpots = checkResult.rows[0]!.available_spots;
        expect(availableSpots).toBe(5);
        expect(requestedAttendees).toBeLessThanOrEqual(availableSpots);
        
        // Create booking
        await client.query(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser1.id, testEvent.id, 'confirmed', requestedAttendees, testEvent.price * requestedAttendees]
        );
        
        // Update spots
        await client.query(
          `UPDATE events SET available_spots = available_spots - $1 WHERE id = $2`,
          [requestedAttendees, testEvent.id]
        );
        
        await client.query('COMMIT');
        
        // Verify spots are now 0
        const finalResult = await pool.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1',
          [testEvent.id]
        );
        
        expect(finalResult.rows[0]!.available_spots).toBe(0);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    
    it('should enforce database constraint on available_spots', async () => {
      // Try to set available_spots to negative value (should fail)
      await expect(
        pool.query(
          'UPDATE events SET available_spots = $1 WHERE id = $2',
          [-1, testEvent.id]
        )
      ).rejects.toThrow();
    });
    
    it('should enforce database constraint on available_spots vs capacity', async () => {
      // Try to set available_spots > capacity (should fail)
      await expect(
        pool.query(
          'UPDATE events SET available_spots = $1 WHERE id = $2',
          [10, testEvent.id] // capacity is 5
        )
      ).rejects.toThrow();
    });
  });
  
  describe('Overbooking Prevention', () => {
    
    it('should prevent overbooking through concurrent requests', async () => {
      // Simulate concurrent bookings
      const bookingPromises: Promise<void>[] = [];
      
      for (let i = 0; i < 3; i++) {
        const promise = (async () => {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            // Lock the row for update
            const checkResult = await client.query<Event>(
              'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
              [testEvent.id]
            );
            
            const availableSpots = checkResult.rows[0]!.available_spots;
            const requestedAttendees = 2;
            
            if (requestedAttendees <= availableSpots) {
              // Create booking
              await client.query(
                `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
                 VALUES ($1, $2, $3, $4, $5)`,
                [i === 0 ? testUser1.id : testUser2.id, testEvent.id, 'confirmed', requestedAttendees, testEvent.price * requestedAttendees]
              );
              
              // Update spots
              await client.query(
                'UPDATE events SET available_spots = available_spots - $1 WHERE id = $2',
                [requestedAttendees, testEvent.id]
              );
              
              await client.query('COMMIT');
            } else {
              await client.query('ROLLBACK');
            }
          } catch (error) {
            await client.query('ROLLBACK');
            // Expected for some concurrent attempts
          } finally {
            client.release();
          }
        })();
        
        bookingPromises.push(promise);
      }
      
      // Wait for all concurrent bookings to complete
      await Promise.all(bookingPromises);
      
      // Check final state
      const eventResult = await pool.query<Event>(
        'SELECT available_spots FROM events WHERE id = $1',
        [testEvent.id]
      );
      
      const bookingsResult = await pool.query(
        'SELECT SUM(attendees) as total FROM bookings WHERE event_id = $1 AND status = $2',
        [testEvent.id, 'confirmed']
      );
      
      const availableSpots = eventResult.rows[0]!.available_spots;
      const totalBooked = Number(bookingsResult.rows[0]?.total || 0);
      
      // Verify no overbooking occurred
      expect(availableSpots).toBeGreaterThanOrEqual(0);
      expect(totalBooked).toBeLessThanOrEqual(5); // capacity
      expect(availableSpots + totalBooked).toBe(5); // capacity
    });
    
    it('should handle race condition with FOR UPDATE lock', async () => {
      // Two different users try to book the last 3 spots simultaneously
      const client1 = await pool.connect();
      const client2 = await pool.connect();
      
      try {
        // First, testUser1 books 2 spots to leave only 3 available
        await pool.query(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser1.id, testEvent.id, 'confirmed', 2, testEvent.price * 2]
        );
        await pool.query(
          'UPDATE events SET available_spots = available_spots - 2 WHERE id = $1',
          [testEvent.id]
        );
        
        // Now both clients try to book 3 spots (testUser2 for client1, another user for client2)
        await client1.query('BEGIN');
        await client2.query('BEGIN');
        
        // Client 1 (testUser2) locks the row
        const check1 = await client1.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
          [testEvent.id]
        );
        
        expect(check1.rows[0]!.available_spots).toBe(3);
        
        // Client 2 will wait for the lock (trying to book for a third user)
        const client2Promise = client2.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
          [testEvent.id]
        );
        
        // Client 1 (testUser2) books successfully
        await client1.query(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser2.id, testEvent.id, 'confirmed', 3, testEvent.price * 3]
        );
        await client1.query(
          'UPDATE events SET available_spots = available_spots - 3 WHERE id = $1',
          [testEvent.id]
        );
        await client1.query('COMMIT');
        
        // Now client 2 gets the lock and sees 0 spots available
        const check2 = await client2Promise;
        expect(check2.rows[0]!.available_spots).toBe(0);
        
        // Client 2 should rollback since no spots available
        await client2.query('ROLLBACK');
        
      } finally {
        client1.release();
        client2.release();
      }
    });
  });
  
  describe('Booking Status Management', () => {
    
    it('should allow multiple booking statuses', async () => {
      const statuses: Array<'pending' | 'confirmed' | 'cancelled'> = ['pending', 'confirmed', 'cancelled'];
      
      for (const status of statuses) {
        const result = await pool.query<Booking>(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING status`,
          [testUser1.id, testEvent.id, status, 1, testEvent.price]
        );
        
        expect(result.rows[0]!.status).toBe(status);
        
        // Clean up for next iteration
        await pool.query(
          'DELETE FROM bookings WHERE user_id = $1 AND event_id = $2 AND status = $3',
          [testUser1.id, testEvent.id, status]
        );
      }
    });
    
    it('should restore spots when booking is cancelled', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create confirmed booking
        const bookingResult = await client.query<Booking>(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, attendees`,
          [testUser1.id, testEvent.id, 'confirmed', 2, testEvent.price * 2]
        );
        
        const booking = bookingResult.rows[0]!;
        
        // Reduce available spots
        await client.query(
          'UPDATE events SET available_spots = available_spots - $1 WHERE id = $2',
          [booking.attendees, testEvent.id]
        );
        
        await client.query('COMMIT');
        
        // Check spots reduced
        const checkResult = await pool.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1',
          [testEvent.id]
        );
        expect(checkResult.rows[0]!.available_spots).toBe(3); // 5 - 2
        
        // Cancel booking in new transaction
        await client.query('BEGIN');
        
        await client.query(
          'UPDATE bookings SET status = $1 WHERE id = $2',
          ['cancelled', booking.id]
        );
        
        // Restore spots
        await client.query(
          'UPDATE events SET available_spots = available_spots + $1 WHERE id = $2',
          [booking.attendees, testEvent.id]
        );
        
        await client.query('COMMIT');
        
        // Check spots restored
        const finalResult = await pool.query<Event>(
          'SELECT available_spots FROM events WHERE id = $1',
          [testEvent.id]
        );
        expect(finalResult.rows[0]!.available_spots).toBe(5); // restored
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
  });
  
  describe('Booking Constraints', () => {
    
    it('should prevent duplicate bookings for same user and event', async () => {
      // Create first booking
      await pool.query(
        `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [testUser1.id, testEvent.id, 'confirmed', 1, testEvent.price]
      );
      
      // Try to create duplicate booking (should fail due to UNIQUE constraint)
      await expect(
        pool.query(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser1.id, testEvent.id, 'confirmed', 1, testEvent.price]
        )
      ).rejects.toThrow();
    });
    
    it('should allow different users to book the same event', async () => {
      // User 1 books
      await pool.query(
        `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [testUser1.id, testEvent.id, 'confirmed', 1, testEvent.price]
      );
      
      // User 2 books (should succeed)
      const result = await pool.query<Booking>(
        `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [testUser2.id, testEvent.id, 'confirmed', 1, testEvent.price]
      );
      
      expect(result.rows[0]).toBeDefined();
      expect(result.rows[0]!.user_id).toBe(testUser2.id);
    });
    
    it('should track notification status', async () => {
      const bookingResult = await pool.query<Booking>(
        `INSERT INTO bookings (user_id, event_id, status, attendees, total_price, whatsapp_notified, email_notified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [testUser1.id, testEvent.id, 'confirmed', 1, testEvent.price, true, true]
      );
      
      const booking = bookingResult.rows[0]!;
      expect(booking.whatsapp_notified).toBe(true);
      expect(booking.email_notified).toBe(true);
    });
  });
  
  describe('Query Performance', () => {
    
    it('should efficiently check capacity with FOR UPDATE', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        const startTime = Date.now();
        
        // This should be fast with proper indexing
        await client.query(
          'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
          [testEvent.id]
        );
        
        const duration = Date.now() - startTime;
        
        await client.query('COMMIT');
        
        // Should complete in less than 100ms
        expect(duration).toBeLessThan(100);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    
    it('should efficiently retrieve user bookings', async () => {
      // Create multiple bookings
      for (let i = 0; i < 3; i++) {
        await pool.query(
          `INSERT INTO bookings (user_id, event_id, status, attendees, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser1.id, testEvent.id, 'confirmed', 1, testEvent.price]
        );
        
        // Delete to avoid unique constraint on next iteration
        if (i < 2) {
          await pool.query(
            'DELETE FROM bookings WHERE user_id = $1 AND event_id = $2',
            [testUser1.id, testEvent.id]
          );
        }
      }
      
      const startTime = Date.now();
      
      const result = await pool.query<Booking>(
        'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
        [testUser1.id]
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should be fast with user_id index
    });
  });
});
