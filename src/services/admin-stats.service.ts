/**
 * Admin Statistics Service
 * 
 * Provides aggregated statistics and metrics for the admin dashboard.
 * Focuses on key business metrics: courses, orders, revenue, and users.
 */

import { getPool } from '@/lib/db';
import { DatabaseError } from '@/lib/errors';

export interface AdminStats {
  overview: {
    totalCourses: number;
    publishedCourses: number;
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
  };
  trends: {
    newUsersThisMonth: number;
    newCoursesThisMonth: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    growthMetrics: {
      userGrowth: number; // percentage
      courseGrowth: number; // percentage
      revenueGrowth: number; // percentage
    };
  };
  recentActivity: {
    recentOrders: Array<{
      id: string;
      userEmail: string;
      totalAmount: number;
      status: string;
      createdAt: string;
      itemCount: number;
    }>;
    recentUsers: Array<{
      id: string;
      name: string;
      email: string;
      createdAt: string;
    }>;
  };
  courseStats: {
    topCourses: Array<{
      id: string;
      title: string;
      enrollments: number;
      revenue: number;
    }>;
    coursesByCategory: Array<{
      category: string;
      count: number;
    }>;
  };
}

/**
 * Get comprehensive admin statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const pool = getPool();

  if (!pool) {
    throw new DatabaseError('Database connection not configured');
  }

  try {
    // Get current date for monthly calculations
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Overview statistics
    const overviewPromise = Promise.all([
      // Total and published courses
      pool.query(`
        SELECT 
          COUNT(*) as total_courses,
          COUNT(CASE WHEN is_published = true THEN 1 END) as published_courses
        FROM courses 
        WHERE deleted_at IS NULL
      `),
      
      // Total users
      pool.query(`
        SELECT COUNT(*) as total_users 
        FROM users 
        WHERE deleted_at IS NULL
      `),
      
      // Order statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders
      `),
    ]);

    // Monthly trends
    const trendsPromise = Promise.all([
      // New users this month
      pool.query(`
        SELECT COUNT(*) as new_users_this_month
        FROM users 
        WHERE created_at >= $1 AND deleted_at IS NULL
      `, [firstOfMonth]),

      // New users last month (for growth calculation)
      pool.query(`
        SELECT COUNT(*) as new_users_last_month
        FROM users 
        WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL
      `, [firstOfLastMonth, lastOfLastMonth]),

      // New courses this month
      pool.query(`
        SELECT COUNT(*) as new_courses_this_month
        FROM courses 
        WHERE created_at >= $1 AND deleted_at IS NULL
      `, [firstOfMonth]),

      // New courses last month
      pool.query(`
        SELECT COUNT(*) as new_courses_last_month
        FROM courses 
        WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL
      `, [firstOfLastMonth, lastOfLastMonth]),

      // Orders this month
      pool.query(`
        SELECT 
          COUNT(*) as orders_this_month,
          COALESCE(SUM(total_amount), 0) as revenue_this_month
        FROM orders 
        WHERE created_at >= $1
      `, [firstOfMonth]),

      // Orders last month
      pool.query(`
        SELECT 
          COUNT(*) as orders_last_month,
          COALESCE(SUM(total_amount), 0) as revenue_last_month
        FROM orders 
        WHERE created_at >= $1 AND created_at <= $2
      `, [firstOfLastMonth, lastOfLastMonth]),
    ]);

    // Recent activity
    const activityPromise = Promise.all([
      // Recent orders
      pool.query(`
        SELECT 
          o.id,
          u.email as user_email,
          o.total_amount,
          o.status,
          o.created_at,
          COUNT(oi.id) as item_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id, u.email, o.total_amount, o.status, o.created_at
        ORDER BY o.created_at DESC
        LIMIT 5
      `),

      // Recent users
      pool.query(`
        SELECT id, name, email, created_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ]);

    // Course statistics
    const courseStatsPromise = Promise.all([
      // Top courses by enrollments
      pool.query(`
        SELECT 
          c.id,
          c.title,
          COUNT(oi.id) as enrollments,
          COALESCE(SUM(oi.price), 0) as revenue
        FROM courses c
        LEFT JOIN order_items oi ON c.id = oi.course_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
        WHERE c.deleted_at IS NULL
        GROUP BY c.id, c.title
        ORDER BY enrollments DESC, revenue DESC
        LIMIT 5
      `),

      // Courses by category
      pool.query(`
        SELECT 
          category,
          COUNT(*) as count
        FROM courses
        WHERE deleted_at IS NULL AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
      `),
    ]);

    // Execute all queries
    const [overviewResults, trendsResults, activityResults, courseStatsResults] = await Promise.all([
      overviewPromise,
      trendsPromise,
      activityPromise,
      courseStatsPromise,
    ]);

    // Parse overview results
    const courseStats = overviewResults[0].rows[0];
    const userStats = overviewResults[1].rows[0];
    const orderStats = overviewResults[2].rows[0];

    // Parse trends results
    const newUsersThisMonth = trendsResults[0].rows[0].new_users_this_month;
    const newUsersLastMonth = trendsResults[1].rows[0].new_users_last_month;
    const newCoursesThisMonth = trendsResults[2].rows[0].new_courses_this_month;
    const newCoursesLastMonth = trendsResults[3].rows[0].new_courses_last_month;
    const ordersThisMonth = trendsResults[4].rows[0].orders_this_month;
    const revenueThisMonth = parseFloat(trendsResults[4].rows[0].revenue_this_month || 0);
    const ordersLastMonth = trendsResults[5].rows[0].orders_last_month;
    const revenueLastMonth = parseFloat(trendsResults[5].rows[0].revenue_last_month || 0);

    // Calculate growth percentages
    const userGrowth = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : newUsersThisMonth > 0 ? 100 : 0;

    const courseGrowth = newCoursesLastMonth > 0 
      ? ((newCoursesThisMonth - newCoursesLastMonth) / newCoursesLastMonth) * 100 
      : newCoursesThisMonth > 0 ? 100 : 0;

    const revenueGrowth = revenueLastMonth > 0 
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
      : revenueThisMonth > 0 ? 100 : 0;

    // Parse activity results
    const recentOrders = activityResults[0].rows.map(row => ({
      id: row.id,
      userEmail: row.user_email,
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      createdAt: row.created_at.toISOString(),
      itemCount: parseInt(row.item_count),
    }));

    const recentUsers = activityResults[1].rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at.toISOString(),
    }));

    // Parse course statistics
    const topCourses = courseStatsResults[0].rows.map(row => ({
      id: row.id,
      title: row.title,
      enrollments: parseInt(row.enrollments),
      revenue: parseFloat(row.revenue),
    }));

    const coursesByCategory = courseStatsResults[1].rows.map(row => ({
      category: row.category,
      count: parseInt(row.count),
    }));

    return {
      overview: {
        totalCourses: parseInt(courseStats.total_courses),
        publishedCourses: parseInt(courseStats.published_courses),
        totalUsers: parseInt(userStats.total_users),
        totalOrders: parseInt(orderStats.total_orders),
        totalRevenue: parseFloat(orderStats.total_revenue || 0),
        pendingOrders: parseInt(orderStats.pending_orders),
      },
      trends: {
        newUsersThisMonth: parseInt(newUsersThisMonth),
        newCoursesThisMonth: parseInt(newCoursesThisMonth),
        ordersThisMonth: parseInt(ordersThisMonth),
        revenueThisMonth,
        growthMetrics: {
          userGrowth: Math.round(userGrowth * 100) / 100, // Round to 2 decimals
          courseGrowth: Math.round(courseGrowth * 100) / 100,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        },
      },
      recentActivity: {
        recentOrders,
        recentUsers,
      },
      courseStats: {
        topCourses,
        coursesByCategory,
      },
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw new DatabaseError('Failed to fetch admin statistics');
  }
}

/**
 * Get dashboard quick stats for header widgets
 */
export async function getQuickStats() {
  const pool = getPool();

  if (!pool) {
    throw new DatabaseError('Database connection not configured');
  }

  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL) as total_courses,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') as total_revenue
    `);

    const row = result.rows[0];
    return {
      totalCourses: parseInt(row.total_courses),
      totalUsers: parseInt(row.total_users),
      pendingOrders: parseInt(row.pending_orders),
      totalRevenue: parseFloat(row.total_revenue),
    };
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    throw new DatabaseError('Failed to fetch quick statistics');
  }
}