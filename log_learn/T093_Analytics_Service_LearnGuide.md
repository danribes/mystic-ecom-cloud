# T093: Analytics Service - Learning Guide

**Date:** November 1, 2025  
**Level:** Intermediate  
**Time:** 3-4 hours  
**Focus:** Data analytics, PostgreSQL aggregations, business intelligence

---

## Learning Objectives

After completing this guide, you will understand:

1. Analytics data modeling for web applications
2. Complex PostgreSQL aggregations and CTEs
3. Time-series analysis (day/week/month comparisons)
4. Conversion rate calculations
5. Trending algorithms
6. Search effectiveness metrics

---

## Core Concepts

### 1. Event Tracking Architecture

**Pattern:** Store granular events, aggregate on query

```typescript
// ✅ GOOD: Store individual events
INSERT INTO product_views (product_id, user_id, timestamp);

// ❌ BAD: Pre-aggregate
UPDATE product_stats SET view_count = view_count + 1;
```

**Why?**
- Flexibility: Can slice data any way later
- Auditability: Can verify exact user behavior
- Analytics: Support complex queries
- Debugging: Can trace individual events

### 2. Nullable vs Required Fields

```sql
CREATE TABLE product_views (
  id UUID PRIMARY KEY,
  user_id UUID,              -- NULLABLE (anonymous users)
  session_id VARCHAR(255),   -- NULLABLE (not always available)
  ip_address VARCHAR(45),    -- REQUIRED (always capture)
  viewed_at TIMESTAMP NOT NULL
);
```

**Design Decision Tree:**
- Can the value be unknown? → Nullable
- Is it critical for analysis? → NOT NULL
- Is it personally identifying? → Consider privacy laws

### 3. Time-Based Filtering

**PostgreSQL Intervals:**
```sql
-- Last 24 hours
WHERE viewed_at >= NOW() - INTERVAL '1 day'

-- Last 7 days
WHERE viewed_at >= NOW() - INTERVAL '7 days'

-- Last 30 days
WHERE viewed_at >= NOW() - INTERVAL '30 days'

-- This month
WHERE viewed_at >= DATE_TRUNC('month', NOW())

-- This year
WHERE viewed_at >= DATE_TRUNC('year', NOW())
```

**Best Practice:** Use INTERVAL for relative dates, not hardcoded timestamps.

### 4. Conversion Rate Math

```typescript
conversion_rate = (conversions / unique_viewers) * 100

// Example:
// 1000 views, 500 unique users, 25 purchases
// Conversion rate = (25 / 500) * 100 = 5%
```

**Common Mistake:**
```sql
-- ❌ WRONG: Uses total views (inflated)
conversions / total_views * 100

-- ✅ RIGHT: Uses unique users
conversions / COUNT(DISTINCT user_id) * 100
```

---

## Function Implementations

### Function 1: trackProductView()

**Learning Focus:** Non-blocking tracking

```typescript
export async function trackProductView(
  productId: string,
  userId: string | null,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_views 
       (digital_product_id, user_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [productId, userId, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('[trackProductView] Error:', error);
    // DON'T throw - tracking shouldn't break user experience
  }
}
```

**Key Concepts:**

1. **Non-Blocking:** Never throw errors
   - User experience > perfect tracking
   - Log errors for monitoring
   - Continue execution

2. **Optional User ID:** Support anonymous tracking
   ```typescript
   userId: string | null  // null for anonymous users
   ```

3. **Metadata Capture:**
   - IP: Fraud detection, geolocation
   - User Agent: Device/browser analytics
   - Timestamp: Automatic via DEFAULT NOW()

**Exercise:** Add referrer tracking
```typescript
export async function trackProductView(
  productId: string,
  userId: string | null,
  ipAddress: string,
  userAgent: string,
  referrer?: string  // Add this
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_views 
       (digital_product_id, user_id, ip_address, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, userId, ipAddress, userAgent, referrer]
    );
  } catch (error) {
    console.error('[trackProductView] Error:', error);
  }
}
```

### Function 2: getProductViewStats()

**Learning Focus:** Parallel queries, aggregations

```typescript
export async function getProductViewStats(
  productId: string,
  timeframe: 'day' | 'week' | 'month' = 'week'
) {
  const timeCondition = 
    timeframe === 'day' ? "AND viewed_at >= NOW() - INTERVAL '1 day'" :
    timeframe === 'week' ? "AND viewed_at >= NOW() - INTERVAL '7 days'" :
    timeframe === 'month' ? "AND viewed_at >= NOW() - INTERVAL '30 days'" :
    '';

  // Run two queries in parallel
  const [statsResult, dailyResult] = await Promise.all([
    // Query 1: Aggregate stats
    pool.query(`
      SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
        COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) as unique_sessions
      FROM product_views
      WHERE digital_product_id = $1 ${timeCondition}
    `, [productId]),
    
    // Query 2: Daily breakdown
    pool.query(`
      SELECT 
        DATE(viewed_at) as date,
        COUNT(*) as count
      FROM product_views
      WHERE digital_product_id = $1 ${timeCondition}
      GROUP BY DATE(viewed_at)
      ORDER BY date DESC
      LIMIT 30
    `, [productId])
  ]);

  return {
    total_views: parseInt(statsResult.rows[0].total_views),
    unique_users: parseInt(statsResult.rows[0].unique_users),
    unique_sessions: parseInt(statsResult.rows[0].unique_sessions),
    views_by_day: dailyResult.rows,
  };
}
```

**Key Concepts:**

1. **Promise.all() for Parallel Execution**
   ```typescript
   // ❌ SLOW: Sequential (50ms + 50ms = 100ms)
   const stats = await getStats();
   const daily = await getDaily();
   
   // ✅ FAST: Parallel (max(50ms, 50ms) = 50ms)
   const [stats, daily] = await Promise.all([
     getStats(),
     getDaily()
   ]);
   ```

2. **COUNT DISTINCT with FILTER**
   ```sql
   COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
   ```
   - Counts unique values
   - Excludes NULLs
   - PostgreSQL-specific syntax
   - More efficient than subquery

3. **Date Grouping**
   ```sql
   GROUP BY DATE(viewed_at)
   ```
   - Truncates timestamp to date
   - Groups all views on same day
   - Essential for time-series analysis

**Exercise:** Add hour-by-hour breakdown
```typescript
// Add to dailyResult query:
const hourlyResult = await pool.query(`
  SELECT 
    EXTRACT(HOUR FROM viewed_at) as hour,
    COUNT(*) as count
  FROM product_views
  WHERE digital_product_id = $1 
    AND viewed_at >= NOW() - INTERVAL '24 hours'
  GROUP BY EXTRACT(HOUR FROM viewed_at)
  ORDER BY hour
`, [productId]);

return {
  // ... existing fields
  views_by_hour: hourlyResult.rows
};
```

### Function 3: getPopularProducts()

**Learning Focus:** Complex JOINs, conversion rate calculation

```typescript
export async function getPopularProducts(limit = 10, timeframe = 'week') {
  const timeCondition = getTimeframeCondition(timeframe);

  const query = `
    SELECT 
      dp.id,
      dp.title,
      COUNT(pv.id) as total_views,
      COUNT(DISTINCT pv.user_id) FILTER (WHERE pv.user_id IS NOT NULL) as unique_users,
      (
        COUNT(DISTINCT oi.order_id) FILTER (WHERE o.status = 'completed')::numeric / 
        NULLIF(COUNT(DISTINCT pv.user_id) FILTER (WHERE pv.user_id IS NOT NULL), 0) * 100
      ) as conversion_rate
    FROM digital_products dp
    INNER JOIN product_views pv ON pv.digital_product_id = dp.id
    LEFT JOIN order_items oi 
      ON oi.item_id = dp.id 
      AND oi.item_type = 'digital_product'
    LEFT JOIN orders o ON o.id = oi.order_id
    WHERE dp.is_published = true
      ${timeCondition}
    GROUP BY dp.id
    ORDER BY total_views DESC, conversion_rate DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
}
```

**Key Concepts:**

1. **Division by Zero Protection**
   ```sql
   NULLIF(COUNT(...), 0)
   ```
   - Returns NULL if count is 0
   - Prevents division by zero error
   - Result is NULL instead of error

2. **Type Casting for Division**
   ```sql
   COUNT(...)::numeric / NULLIF(..., 0)
   ```
   - `::numeric` casts to decimal type
   - Integer division: `5 / 2 = 2`
   - Numeric division: `5::numeric / 2 = 2.5`

3. **FILTER Clause**
   ```sql
   COUNT(DISTINCT oi.order_id) FILTER (WHERE o.status = 'completed')
   ```
   - Applies condition only to this aggregation
   - More readable than CASE WHEN
   - PostgreSQL 9.4+

**Exercise:** Add revenue metrics
```typescript
const query = `
  SELECT 
    dp.id,
    dp.title,
    COUNT(pv.id) as total_views,
    COUNT(DISTINCT oi.order_id) FILTER (WHERE o.status = 'completed') as purchases,
    SUM(oi.price) FILTER (WHERE o.status = 'completed') as revenue,
    (SUM(oi.price) FILTER (WHERE o.status = 'completed') / 
     COUNT(DISTINCT pv.user_id))::numeric(10,2) as revenue_per_view
  FROM ...
`;
```

### Function 4: getTrendingProducts()

**Learning Focus:** CTEs, growth calculation

```typescript
export async function getTrendingProducts(limit = 10) {
  const query = `
    WITH current_week AS (
      SELECT digital_product_id, COUNT(*) as views
      FROM product_views
      WHERE viewed_at >= NOW() - INTERVAL '7 days'
      GROUP BY digital_product_id
    ),
    previous_week AS (
      SELECT digital_product_id, COUNT(*) as views
      FROM product_views
      WHERE viewed_at >= NOW() - INTERVAL '14 days'
        AND viewed_at < NOW() - INTERVAL '7 days'
      GROUP BY digital_product_id
    )
    SELECT 
      dp.id,
      dp.title,
      COALESCE(cw.views, 0) as current_week_views,
      COALESCE(pw.views, 0) as previous_week_views,
      CASE 
        WHEN COALESCE(pw.views, 0) = 0 THEN 100.0
        ELSE ((COALESCE(cw.views, 0)::numeric - COALESCE(pw.views, 0)) / 
              COALESCE(pw.views, 1) * 100)
      END as growth_percentage
    FROM digital_products dp
    LEFT JOIN current_week cw ON cw.digital_product_id = dp.id
    LEFT JOIN previous_week pw ON pw.digital_product_id = dp.id
    WHERE COALESCE(cw.views, 0) > 0
    ORDER BY growth_percentage DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
}
```

**Key Concepts:**

1. **Common Table Expressions (CTEs)**
   ```sql
   WITH cte_name AS (
     SELECT ...
   )
   SELECT * FROM cte_name;
   ```
   - Named temporary result sets
   - Makes complex queries readable
   - Can reference in main query
   - Scoped to single query

2. **Growth Percentage Formula**
   ```typescript
   growth = ((current - previous) / previous) * 100
   
   // Examples:
   // Current: 20, Previous: 10 → (20-10)/10*100 = 100% growth
   // Current: 15, Previous: 10 → (15-10)/10*100 = 50% growth
   // Current: 10, Previous: 20 → (10-20)/20*100 = -50% decline
   ```

3. **COALESCE for Default Values**
   ```sql
   COALESCE(cw.views, 0)
   ```
   - Returns first non-NULL value
   - Prevents NULL in calculations
   - Alternative: `IFNULL()` (MySQL)

**Exercise:** Add minimum threshold
```typescript
// Only show products with at least 10 views this week
WHERE COALESCE(cw.views, 0) >= 10
```

### Function 5: getSearchAnalytics()

**Learning Focus:** Search effectiveness metrics

```typescript
export async function getSearchAnalytics(timeframe = 'week') {
  const timeCondition = getTimeframeCondition(timeframe);

  const query = `
    SELECT 
      COUNT(*) as total_searches,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
      AVG(results_count)::numeric(10,2) as avg_results,
      COUNT(*) FILTER (WHERE results_count = 0) as zero_result_searches,
      (COUNT(*) FILTER (WHERE results_count = 0)::numeric / 
       NULLIF(COUNT(*), 0) * 100)::numeric(10,2) as zero_result_percentage
    FROM search_logs
    WHERE 1=1 ${timeCondition}
  `;

  const result = await pool.query(query);
  return result.rows[0];
}
```

**Key Metrics:**

1. **Zero Result Percentage**
   - Industry benchmark: < 20%
   - High percentage → content gap or poor search
   - Action: Create missing content

2. **Average Results Per Search**
   - Too high (>50) → need filtering
   - Too low (<5) → narrow inventory
   - Optimal: 10-30 results

**Exercise:** Add click-through tracking
```typescript
// Modify search_logs table:
ALTER TABLE search_logs ADD COLUMN clicked_result_id UUID;

// Track when user clicks a result:
export async function trackSearchClick(
  searchLogId: string,
  productId: string
) {
  await pool.query(
    'UPDATE search_logs SET clicked_result_id = $1 WHERE id = $2',
    [productId, searchLogId]
  );
}

// Calculate click-through rate:
SELECT 
  COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL)::numeric /
  COUNT(*) * 100 as click_through_rate
FROM search_logs;
```

---

## Performance Optimization

### 1. Index Strategy

```sql
-- Product lookups
CREATE INDEX idx_product_views_product 
  ON product_views(digital_product_id);

-- Time-based queries
CREATE INDEX idx_product_views_time 
  ON product_views(viewed_at DESC);

-- User lookups (partial - only index non-NULL)
CREATE INDEX idx_product_views_user 
  ON product_views(user_id) 
  WHERE user_id IS NOT NULL;

-- Composite for JOINs
CREATE INDEX idx_product_views_product_user 
  ON product_views(digital_product_id, user_id);
```

**Why Partial Indexes?**
- Smaller index size
- Faster inserts
- Only index useful values

### 2. Query Optimization

```sql
-- ❌ SLOW: Subquery in SELECT
SELECT 
  p.*,
  (SELECT COUNT(*) FROM views WHERE product_id = p.id) as view_count
FROM products p;

-- ✅ FAST: JOIN with GROUP BY
SELECT 
  p.*,
  COUNT(v.id) as view_count
FROM products p
LEFT JOIN views v ON v.product_id = p.id
GROUP BY p.id;
```

### 3. Caching Strategy

```typescript
import Redis from 'ioredis';
const redis = new Redis();

export async function getPopularProducts(limit = 10) {
  const cacheKey = `popular:${limit}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query database
  const products = await queryPopularProducts(limit);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(products));
  
  return products;
}
```

---

## Common Patterns

### Pattern 1: Timeframe Filtering

```typescript
function getTimeframeCondition(timeframe: string): string {
  switch (timeframe) {
    case 'day': return "AND viewed_at >= NOW() - INTERVAL '1 day'";
    case 'week': return "AND viewed_at >= NOW() - INTERVAL '7 days'";
    case 'month': return "AND viewed_at >= NOW() - INTERVAL '30 days'";
    default: return '';
  }
}

// Usage:
const condition = getTimeframeCondition('week');
const query = `SELECT * FROM views WHERE 1=1 ${condition}`;
```

### Pattern 2: Safe Division

```sql
-- ❌ ERROR: division by zero
SELECT total / count FROM stats;

-- ✅ SAFE: returns NULL on zero
SELECT total / NULLIF(count, 0) FROM stats;

-- ✅ SAFE: returns 0 on zero
SELECT total / NULLIF(count, 0)::numeric, 0) FROM stats;
```

### Pattern 3: Percentage Calculation

```sql
-- Template:
(count_of_subset::numeric / NULLIF(count_of_total, 0) * 100)::numeric(10,2)

-- Example:
(COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
 NULLIF(COUNT(*), 0) * 100)::numeric(10,2) as completion_rate
```

---

## Practice Exercises

### Exercise 1: Device Analytics

Add device tracking and analytics:

```typescript
// 1. Modify trackProductView to parse user agent
export async function trackProductView(
  productId: string,
  userId: string | null,
  ipAddress: string,
  userAgent: string
) {
  const device = parseUserAgent(userAgent); // mobile, desktop, tablet
  
  await pool.query(
    `INSERT INTO product_views 
     (digital_product_id, user_id, ip_address, user_agent, device_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [productId, userId, ipAddress, userAgent, device]
  );
}

// 2. Create function to get device breakdown
export async function getDeviceStats(productId: string) {
  const query = `
    SELECT 
      device_type,
      COUNT(*) as views,
      (COUNT(*)::numeric / SUM(COUNT(*)) OVER() * 100)::numeric(10,2) as percentage
    FROM product_views
    WHERE digital_product_id = $1
    GROUP BY device_type
    ORDER BY views DESC
  `;
  
  // TODO: Implement
}
```

### Exercise 2: Cohort Analysis

Track user retention:

```typescript
export async function getCohortAnalysis() {
  const query = `
    WITH user_first_view AS (
      SELECT 
        user_id,
        DATE_TRUNC('week', MIN(viewed_at)) as cohort_week
      FROM product_views
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    ),
    user_activity AS (
      SELECT 
        ufv.cohort_week,
        DATE_TRUNC('week', pv.viewed_at) as activity_week,
        COUNT(DISTINCT pv.user_id) as active_users
      FROM user_first_view ufv
      JOIN product_views pv ON pv.user_id = ufv.user_id
      GROUP BY ufv.cohort_week, DATE_TRUNC('week', pv.viewed_at)
    )
    SELECT 
      cohort_week,
      activity_week,
      active_users,
      -- Week 0, Week 1, Week 2, etc.
      EXTRACT(WEEK FROM activity_week - cohort_week) as weeks_since_cohort
    FROM user_activity
    ORDER BY cohort_week, weeks_since_cohort
  `;
  
  // TODO: Implement
}
```

### Exercise 3: A/B Testing

Track experiment variants:

```typescript
interface ExperimentTrack {
  userId: string;
  experimentId: string;
  variant: 'A' | 'B';
  converted: boolean;
}

export async function trackExperiment(data: ExperimentTrack) {
  // TODO: Implement tracking
}

export async function getExperimentResults(experimentId: string) {
  const query = `
    SELECT 
      variant,
      COUNT(*) as users,
      COUNT(*) FILTER (WHERE converted = true) as conversions,
      (COUNT(*) FILTER (WHERE converted = true)::numeric / 
       COUNT(*) * 100) as conversion_rate
    FROM experiments
    WHERE experiment_id = $1
    GROUP BY variant
  `;
  
  // TODO: Implement
}
```

---

## Testing

### Unit Test Example

```typescript
import { describe, test, expect } from '@jest/globals';
import { getTimeframeCondition } from './analytics';

describe('Analytics Helpers', () => {
  test('getTimeframeCondition returns correct intervals', () => {
    expect(getTimeframeCondition('day')).toContain("INTERVAL '1 day'");
    expect(getTimeframeCondition('week')).toContain("INTERVAL '7 days'");
    expect(getTimeframeCondition('month')).toContain("INTERVAL '30 days'");
    expect(getTimeframeCondition('all')).toBe('');
  });
});
```

### Integration Test Example

```typescript
test('popular products sorted correctly', async () => {
  // Create views
  await trackProductView(product1, user1, ip, ua);
  await trackProductView(product1, user2, ip, ua);
  await trackProductView(product2, user1, ip, ua);
  
  // Get popular products
  const popular = await getPopularProducts(10);
  
  // Verify sorting
  expect(popular[0].product_id).toBe(product1); // 2 views
  expect(popular[1].product_id).toBe(product2); // 1 view
});
```

---

## Additional Resources

**Documentation:**
- [PostgreSQL Aggregation Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL CTEs](https://www.postgresql.org/docs/current/queries-with.html)

**Books:**
- "SQL Performance Explained" by Markus Winand
- "Designing Data-Intensive Applications" by Martin Kleppmann

**Courses:**
- [PostgreSQL for Data Analytics](https://www.udacity.com/)
- [SQL for Business Intelligence](https://www.datacamp.com/)

---

## Conclusion

You've learned:
- ✅ Analytics data modeling
- ✅ Complex SQL aggregations
- ✅ Time-series analysis
- ✅ Conversion rate calculations
- ✅ Performance optimization
- ✅ Testing strategies

**Next Steps:**
1. Implement device analytics
2. Add cohort analysis
3. Build real-time dashboard
4. Add A/B testing support

**Time to Proficiency:** 2-3 weeks of practice

Keep tracking! 📊
