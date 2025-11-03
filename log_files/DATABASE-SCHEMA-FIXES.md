# Database Schema Fixes

**Date**: October 31, 2025  
**Status**: ✅ COMPLETE  
**Issue**: Missing columns causing test failures

---

## Issues Fixed

### 1. Users Table - Missing `deleted_at` Column

**Error**:
```
column "deleted_at" does not exist in relation "users"
```

**Affected Tests**:
- Course Service tests (instructor validation)
- Order Service tests (user validation)

**Fix Applied**:
```sql
ALTER TABLE users 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

**Updated**: `database/schema.sql` to include the column

---

### 2. Courses Table - Missing Multiple Columns

**Errors**:
```
column "deleted_at" does not exist
column "long_description" does not exist
column "instructor_id" does not exist
... and 10 more columns
```

**Affected Tests**:
- All Course Service tests

**Columns Added**:
```sql
ALTER TABLE courses ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE courses ADD COLUMN long_description TEXT;
ALTER TABLE courses ADD COLUMN instructor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN duration INTEGER;
ALTER TABLE courses ADD COLUMN category VARCHAR(100);
ALTER TABLE courses ADD COLUMN thumbnail_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN preview_video_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN learning_outcomes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN prerequisites JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN is_featured BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE courses ADD COLUMN price_cents INTEGER;
ALTER TABLE courses ADD COLUMN enrollment_count INTEGER DEFAULT 0;
```

**Indexes Added**:
```sql
CREATE INDEX idx_courses_deleted_at ON courses(deleted_at);
```

---

### 3. Order Service Test - Invalid UUID

**Error**:
```
invalid input syntax for type uuid: "test-user-order-123"
```

**Affected Tests**:
- Order Service beforeAll/afterAll/beforeEach

**Fix Applied**:
Changed test user ID from string to valid UUID:
```typescript
// Before:
const testUserId = 'test-user-order-123';

// After:
const testUserId = '00000000-0000-0000-0000-000000000099';
```

Added test user creation:
```typescript
await pool.query(`
  INSERT INTO users (id, email, password_hash, name, role)
  VALUES ($1, 'test-order-user@example.com', 'hash', 'Test Order User', 'user')
  ON CONFLICT (email) DO NOTHING
`, [testUserId]);
```

---

## Test Results

### Before Fixes
```
Test Files  2 failed | 3 passed (5)
Tests  1 failed | 165 passed | 91 skipped (257)
```

**Failures**:
- ❌ course.service.test.ts - Multiple column errors
- ❌ order.service.test.ts - Invalid UUID

### After Fixes
```
Test Files  5 passed (5)
Tests  257 passed (257)
Duration  2.37s
```

**All Tests Passing**:
- ✅ course.service.test.ts (46 tests)
- ✅ cart.service.test.ts (68 tests)
- ✅ order.service.test.ts (91 tests)
- ✅ stripe.test.ts (35 tests)
- ✅ phase2-infrastructure.test.ts (17 tests)

---

## Files Modified

### 1. Database Schema
- **`database/schema.sql`**
  - Added `deleted_at` to users table
  - Added `deleted_at` and 12 other columns to courses table
  - Added indexes for deleted_at columns

### 2. Test Files
- **`tests/unit/order.service.test.ts`**
  - Changed testUserId to valid UUID
  - Added test user creation in beforeAll
  - Added test user cleanup in afterAll

---

## Schema Completeness

The database schema now matches what the services expect:

### Users Table (Complete)
- ✅ id, email, password_hash, name, role
- ✅ whatsapp
- ✅ created_at, updated_at
- ✅ **deleted_at** (soft delete support)

### Courses Table (Complete)
- ✅ id, title, slug, description
- ✅ **long_description** (detailed content)
- ✅ **instructor_id** (foreign key to users)
- ✅ price, **price_cents** (both formats supported)
- ✅ **duration** (renamed from duration_hours)
- ✅ level, **category**
- ✅ image_url, **thumbnail_url**, **preview_video_url**
- ✅ curriculum (JSONB)
- ✅ **tags, learning_outcomes, prerequisites** (JSONB arrays)
- ✅ is_published, **is_featured**
- ✅ **published_at** (timestamp when published)
- ✅ **enrollment_count** (track student enrollments)
- ✅ created_at, updated_at
- ✅ **deleted_at** (soft delete support)

---

## Migration Commands Used

For future reference, these commands were executed to fix the database:

```bash
# Add deleted_at to users
docker-compose exec -T postgres psql -U postgres -d spirituality_platform -c \
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;"

# Add deleted_at to courses
docker-compose exec -T postgres psql -U postgres -d spirituality_platform -c \
  "ALTER TABLE courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;"

# Add all missing columns to courses
docker-compose exec -T postgres psql -U postgres -d spirituality_platform <<'EOF'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS preview_video_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_cents INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0;
EOF
```

---

## Impact on Services

### Course Service
- ✅ Now fully functional with all required columns
- ✅ Soft delete support via deleted_at
- ✅ Instructor relationships working
- ✅ Rich course metadata (tags, outcomes, prerequisites)
- ✅ Enrollment tracking enabled

### Order Service  
- ✅ User validation working correctly
- ✅ UUID handling fixed
- ✅ Test cleanup working properly

### Stripe Service
- ✅ No schema dependencies
- ✅ All 35 tests passing independently

---

## Recommendations

### For Future Schema Changes

1. **Keep schema.sql in sync** with actual database structure
2. **Use migrations** for schema changes in production
3. **Test with fresh database** to catch missing columns early
4. **Document all schema changes** in migration files

### For Test Data

1. **Use valid UUIDs** for foreign keys (format: `00000000-0000-0000-0000-000000000001`)
2. **Create test users** in beforeAll hooks
3. **Clean up test data** in afterAll hooks
4. **Use ON CONFLICT DO NOTHING** for idempotent test setup

---

## Status

✅ **All database schema issues resolved**  
✅ **All 257 tests passing**  
✅ **Ready for continued development**

**Next Steps**: Continue with API endpoint implementation (T036-T047)
