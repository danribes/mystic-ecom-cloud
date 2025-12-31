/**
 * Order Service
 * 
 * Manages order lifecycle including creation, payment, fulfillment, and refunds.
 * - PostgreSQL transactions for atomicity
 * - Order status flow management
 * - Course/event/product fulfillment
 * - Integration with Stripe (future)
 * - Email notifications (future)
 */

import { getPool } from '@/lib/db';
import type { Order, OrderItem, OrderStatus, Cart } from '@/types';
import { ValidationError, NotFoundError, AuthorizationError, ConflictError, DatabaseError } from '@/lib/errors';

/**
 * Create order from cart items
 */
export async function createOrder(
  userId: string,
  cartItems: Cart['items'],
  userEmail: string
): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    // Verify user exists
    const userCheck = await client.query(
      'SELECT id, email FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new NotFoundError('User');
    }

    // Verify all items still exist and are available
    for (const item of cartItems) {
      if (item.itemType === 'course') {
        const result = await client.query(
          'SELECT id, is_published FROM courses WHERE id = $1 AND deleted_at IS NULL',
          [item.itemId]
        );
        if (result.rows.length === 0 || !result.rows[0].is_published) {
          throw new ValidationError(`Course "${item.itemTitle}" is not available`);
        }
      } else if (item.itemType === 'event') {
        const result = await client.query(
          'SELECT id, start_date, max_attendees, (SELECT COUNT(*) FROM bookings WHERE event_id = $1 AND status = $2) as current_bookings FROM events WHERE id = $1 AND deleted_at IS NULL',
          [item.itemId, 'confirmed']
        );
        if (result.rows.length === 0) {
          throw new ValidationError(`Event "${item.itemTitle}" is not available`);
        }
        const event = result.rows[0];
        if (new Date(event.start_date) < new Date()) {
          throw new ValidationError(`Event "${item.itemTitle}" has already started`);
        }
        if (event.max_attendees && event.current_bookings >= event.max_attendees) {
          throw new ValidationError(`Event "${item.itemTitle}" is fully booked`);
        }
      } else if (item.itemType === 'digital_product') {
        const result = await client.query(
          'SELECT id, is_available FROM digital_products WHERE id = $1 AND deleted_at IS NULL',
          [item.itemId]
        );
        if (result.rows.length === 0 || !result.rows[0].is_available) {
          throw new ValidationError(`Digital product "${item.itemTitle}" is not available`);
        }
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.08); // 8% tax
    const total = subtotal + tax;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, tax, total, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, user_id, status, subtotal, tax, total, created_at, updated_at`,
      [userId, 'pending', subtotal, tax, total]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, item_type, item_id, item_title, item_slug, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.itemType, item.itemId, item.itemTitle, item.itemSlug || '', item.price, item.quantity]
      );
    }

    await client.query('COMMIT');

    // Return complete order with items
    return getOrderById(order.id, userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string, userId: string): Promise<Order> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT
      o.id, o.user_id, o.status, o.total_amount,
      o.stripe_payment_intent_id,
      o.created_at, o.updated_at,
      u.email as user_email, u.name as user_name
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Order');
  }

  const orderRow = result.rows[0];

  // Check authorization
  if (orderRow.user_id !== userId) {
    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      throw new AuthorizationError('You do not have permission to view this order');
    }
  }

  // Get order items
  const itemsResult = await pool.query(
    `SELECT id, item_type, course_id as item_id, title as item_title, price, quantity
     FROM order_items
     WHERE order_id = $1
     ORDER BY id`,
    [orderId]
  );

  // Calculate totals from total_amount (stored as decimal, convert to cents)
  const totalInCents = Math.round(parseFloat(orderRow.total_amount) * 100);
  const taxRate = 0.08; // 8% tax
  const subtotal = Math.round(totalInCents / (1 + taxRate));
  const tax = totalInCents - subtotal;

  const order: Order = {
    id: orderRow.id,
    userId: orderRow.user_id,
    userEmail: orderRow.user_email,
    userName: orderRow.user_name,
    status: orderRow.status,
    subtotal: subtotal,
    tax: tax,
    total: totalInCents,
    paymentIntentId: orderRow.stripe_payment_intent_id,
    items: itemsResult.rows.map((item: any) => {
      const itemPrice = Math.round(parseFloat(item.price) * 100);
      return {
        id: item.id,
        orderId: orderRow.id,
        itemType: item.item_type,
        itemId: item.item_id,
        itemTitle: item.item_title,
        price: itemPrice,
        quantity: item.quantity,
        subtotal: itemPrice * item.quantity,
      };
    }),
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at,
  };

  return order;
}

/**
 * Get user orders with pagination
 */
export async function getUserOrders(
  userId: string,
  page: number = 1,
  limit: number = 20,
  status?: OrderStatus
): Promise<{ orders: Order[]; total: number; page: number; limit: number; pages: number }> {
  const pool = getPool();
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE o.user_id = $1';
  const params: any[] = [userId];

  if (status) {
    whereClause += ' AND o.status = $2';
    params.push(status);
  }

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get orders
  const ordersResult = await pool.query(
    `SELECT 
      o.id, o.user_id, o.status, o.subtotal, o.tax, o.total,
      o.payment_intent_id, o.payment_method,
      o.created_at, o.updated_at, o.completed_at,
      u.email as user_email, u.name as user_name,
      COUNT(oi.id) as item_count
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     ${whereClause}
     GROUP BY o.id, u.email, u.name
     ORDER BY o.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const orders: Order[] = await Promise.all(
    ordersResult.rows.map(async (row) => {
      // Get items for each order
      const itemsResult = await pool.query(
        `SELECT id, item_type, item_id, item_title, item_slug, price, quantity
         FROM order_items
         WHERE order_id = $1
         ORDER BY id`,
        [row.id]
      );

      return {
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name,
        status: row.status,
        subtotal: row.subtotal,
        tax: row.tax,
        total: row.total,
        paymentIntentId: row.payment_intent_id,
        paymentMethod: row.payment_method,
        items: itemsResult.rows,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
      };
    })
  );

  return {
    orders,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId?: string
): Promise<Order> {
  const pool = getPool();

  // Validate status transition
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['payment_pending', 'cancelled'],
    payment_pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['completed', 'cancelled'],
    completed: ['refunded'],
    cancelled: [],
    refunded: [],
  };

  // Get current order
  const currentResult = await pool.query(
    'SELECT status, user_id FROM orders WHERE id = $1',
    [orderId]
  );

  if (currentResult.rows.length === 0) {
    throw new NotFoundError('Order');
  }

  const currentStatus = currentResult.rows[0].status as OrderStatus;
  const orderUserId = currentResult.rows[0].user_id;

  // Check if transition is valid
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new ValidationError(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  // Update status
  const updateFields = ['status = $1', 'updated_at = NOW()'];
  const params: any[] = [newStatus];

  if (newStatus === 'completed') {
    updateFields.push('completed_at = NOW()');
  }

  await pool.query(
    `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${params.length + 1}`,
    [...params, orderId]
  );

  return getOrderById(orderId, userId || orderUserId);
}

/**
 * Attach Stripe payment intent to order
 */
export async function attachPaymentIntent(
  orderId: string,
  paymentIntentId: string,
  paymentMethod: string
): Promise<Order> {
  const pool = getPool();

  // Check if order already has payment intent
  const checkResult = await pool.query(
    'SELECT payment_intent_id, user_id FROM orders WHERE id = $1',
    [orderId]
  );

  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Order');
  }

  if (checkResult.rows[0].payment_intent_id) {
    throw new ConflictError('Order already has a payment intent attached');
  }

  // Attach payment intent and update status
  await pool.query(
    `UPDATE orders 
     SET payment_intent_id = $1, payment_method = $2, status = 'payment_pending', updated_at = NOW()
     WHERE id = $3`,
    [paymentIntentId, paymentMethod, orderId]
  );

  return getOrderById(orderId, checkResult.rows[0].user_id);
}

/**
 * Fulfill order - grant access to purchased items
 */
export async function fulfillOrder(orderId: string): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get order
    const orderResult = await client.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    const order = orderResult.rows[0];

    // Validate order is paid
    if (order.status !== 'paid' && order.status !== 'processing') {
      throw new ValidationError('Order must be paid before fulfillment');
    }

    // Get order items
    const itemsResult = await client.query(
      'SELECT item_type, item_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // Fulfill each item
    for (const item of itemsResult.rows) {
      if (item.item_type === 'course') {
        // Grant course access
        await client.query(
          `INSERT INTO course_progress (user_id, course_id, enrollment_date, progress_percentage, last_accessed_at, status)
           VALUES ($1, $2, NOW(), 0, NOW(), 'enrolled')
           ON CONFLICT (user_id, course_id) DO NOTHING`,
          [order.user_id, item.item_id]
        );

        // Increment enrollment count
        await client.query(
          'UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1',
          [item.item_id]
        );
      } else if (item.item_type === 'event') {
        // Create booking
        await client.query(
          `INSERT INTO bookings (user_id, event_id, status, booking_date, number_of_attendees)
           VALUES ($1, $2, 'confirmed', NOW(), $3)`,
          [order.user_id, item.item_id, item.quantity]
        );
      } else if (item.item_type === 'digital_product') {
        // Grant product access (create download record)
        await client.query(
          `INSERT INTO download_logs (user_id, product_id, downloaded_at)
           VALUES ($1, $2, NOW())`,
          [order.user_id, item.item_id]
        );

        // Increment download count
        await client.query(
          'UPDATE digital_products SET download_count = download_count + 1 WHERE id = $1',
          [item.item_id]
        );
      }
    }

    // Update order status to completed
    await client.query(
      `UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');

    return getOrderById(orderId, order.user_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<Order> {
  const pool = getPool();

  // Get order
  const orderResult = await pool.query(
    'SELECT id, user_id, status FROM orders WHERE id = $1',
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw new NotFoundError('Order');
  }

  const order = orderResult.rows[0];

  // Only pending and payment_pending orders can be cancelled
  if (order.status !== 'pending' && order.status !== 'payment_pending') {
    throw new ValidationError('Only pending orders can be cancelled');
  }

  // Update status
  await pool.query(
    `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [orderId]
  );

  return getOrderById(orderId, order.user_id);
}

/**
 * Refund order - revoke access and update status
 */
export async function refundOrder(
  orderId: string,
  reason?: string
): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get order
    const orderResult = await client.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    const order = orderResult.rows[0];

    // Only completed orders can be refunded
    if (order.status !== 'completed') {
      throw new ValidationError('Only completed orders can be refunded');
    }

    // Get order items
    const itemsResult = await client.query(
      'SELECT item_type, item_id FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // Revoke access for each item
    for (const item of itemsResult.rows) {
      if (item.item_type === 'course') {
        // Revoke course access
        await client.query(
          `UPDATE course_progress 
           SET status = 'cancelled'
           WHERE user_id = $1 AND course_id = $2`,
          [order.user_id, item.item_id]
        );

        // Decrement enrollment count
        await client.query(
          'UPDATE courses SET enrollment_count = GREATEST(enrollment_count - 1, 0) WHERE id = $1',
          [item.item_id]
        );
      } else if (item.item_type === 'event') {
        // Cancel booking
        await client.query(
          `UPDATE bookings 
           SET status = 'cancelled'
           WHERE user_id = $1 AND event_id = $2 AND status = 'confirmed'`,
          [order.user_id, item.item_id]
        );
      } else if (item.item_type === 'digital_product') {
        // Decrement download count
        await client.query(
          'UPDATE digital_products SET download_count = GREATEST(download_count - 1, 0) WHERE id = $1',
          [item.item_id]
        );
      }
    }

    // Update order status to refunded
    await client.query(
      `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');

    return getOrderById(orderId, order.user_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get order statistics
 */
export async function getOrderStats(startDate?: Date, endDate?: Date): Promise<{
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  topItems: Array<{ itemType: string; itemId: string; itemTitle: string; totalQuantity: number; totalRevenue: number }>;
}> {
  const pool = getPool();

  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE o.created_at >= $1 AND o.created_at <= $2';
    params.push(startDate, endDate);
  }

  // Total revenue and count
  const revenueResult = await pool.query(
    `SELECT 
      COALESCE(SUM(total), 0) as total_revenue,
      COUNT(*) as order_count,
      COALESCE(AVG(total), 0) as average_order_value
     FROM orders o
     ${dateFilter}
     AND o.status = 'completed'`,
    params
  );

  const stats = revenueResult.rows[0];

  // Orders by status
  const statusResult = await pool.query(
    `SELECT status, COUNT(*) as count
     FROM orders o
     ${dateFilter}
     GROUP BY status`,
    params
  );

  const ordersByStatus: Record<string, number> = {};
  for (const row of statusResult.rows) {
    ordersByStatus[row.status] = parseInt(row.count);
  }

  // Top selling items
  const topItemsResult = await pool.query(
    `SELECT 
      oi.item_type, oi.item_id, oi.item_title,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.price * oi.quantity) as total_revenue
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     ${dateFilter}
     AND o.status = 'completed'
     GROUP BY oi.item_type, oi.item_id, oi.item_title
     ORDER BY total_revenue DESC
     LIMIT 10`,
    params
  );

  return {
    totalRevenue: parseInt(stats.total_revenue),
    orderCount: parseInt(stats.order_count),
    averageOrderValue: Math.round(parseFloat(stats.average_order_value)),
    ordersByStatus: ordersByStatus as Record<OrderStatus, number>,
    topItems: topItemsResult.rows.map(row => ({
      itemType: row.item_type,
      itemId: row.item_id,
      itemTitle: row.item_title,
      totalQuantity: parseInt(row.total_quantity),
      totalRevenue: parseInt(row.total_revenue),
    })),
  };
}

/**
 * Search orders (admin function)
 */
export async function searchOrders(
  query: string,
  filters?: {
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    itemType?: 'course' | 'event' | 'digital_product';
  }
): Promise<Order[]> {
  const pool = getPool();
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  // Search by order ID or user email
  if (query) {
    paramCount++;
    whereClause += ` AND (o.id::text ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
    params.push(`%${query}%`);
  }

  // Filter by status
  if (filters?.status) {
    paramCount++;
    whereClause += ` AND o.status = $${paramCount}`;
    params.push(filters.status);
  }

  // Filter by date range
  if (filters?.startDate) {
    paramCount++;
    whereClause += ` AND o.created_at >= $${paramCount}`;
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    paramCount++;
    whereClause += ` AND o.created_at <= $${paramCount}`;
    params.push(filters.endDate);
  }

  // Filter by item type
  if (filters?.itemType) {
    paramCount++;
    whereClause += ` AND EXISTS (
      SELECT 1 FROM order_items oi 
      WHERE oi.order_id = o.id AND oi.item_type = $${paramCount}
    )`;
    params.push(filters.itemType);
  }

  const ordersResult = await pool.query(
    `SELECT 
      o.id, o.user_id, o.status, o.total_amount,
      o.stripe_payment_intent_id,
      o.created_at, o.updated_at,
      u.email as user_email, u.name as user_name
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT 50`,
    params
  );

  const orders: Order[] = await Promise.all(
    ordersResult.rows.map(async (row) => {
      const itemsResult = await pool.query(
        `SELECT id, item_type, course_id as item_id, title as item_title, price, quantity, created_at
         FROM order_items
         WHERE order_id = $1
         ORDER BY id`,
        [row.id]
      );

      const totalInCents = Math.round(parseFloat(row.total_amount) * 100);
      const taxRate = 0.08; // 8% tax
      const subtotal = Math.round(totalInCents / (1 + taxRate));
      const tax = totalInCents - subtotal;

      return {
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: row.user_name,
        status: row.status,
        subtotal,
        tax,
        total: totalInCents,
        paymentIntentId: row.stripe_payment_intent_id,
        items: itemsResult.rows.map((item: any) => {
          const itemPrice = Math.round(parseFloat(item.price) * 100);
          return {
            id: item.id,
            orderId: row.id,
            itemType: item.item_type,
            itemId: item.item_id,
            itemTitle: item.item_title,
            price: itemPrice,
            quantity: item.quantity,
            subtotal: itemPrice * item.quantity,
            createdAt: item.created_at,
          };
        }),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    })
  );

  return orders;
}
