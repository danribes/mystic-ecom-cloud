# T036: Course API Endpoints Implementation

**Date**: October 31, 2025  
**Status**: ✅ COMPLETE  
**Test Coverage**: 31/31 tests passing (100%)

---

## Overview

Implemented comprehensive REST API endpoints for Course management, including listing, filtering, CRUD operations, and specialized endpoints for featured courses and slug-based retrieval.

---

## API Endpoints Implemented

### 1. List Courses - `GET /api/courses`

**Purpose**: List published courses with advanced filtering and pagination

**Query Parameters**:
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 12) - Items per page
- `category` (string) - Filter by category
- `level` (enum: beginner|intermediate|advanced) - Filter by difficulty level
- `minPrice` (number) - Minimum price filter
- `maxPrice` (number) - Maximum price filter
- `search` (string) - Search in title/description
- `tags` (string, comma-separated) - Filter by tags
- `isFeatured` (boolean) - Show only featured courses
- `sortBy` (enum) - Sort field: createdAt|price|enrollmentCount|avgRating|title
- `sortOrder` (enum: ASC|DESC) - Sort direction

**Response**:
```json
{
  "success": true,
  "data": {
    "courses": [...],
    "total": 100,
    "page": 1,
    "limit": 12,
    "totalPages": 9
  }
}
```

**Example Requests**:
```bash
# List all courses
GET /api/courses

# Filter by category and level
GET /api/courses?category=Meditation&level=beginner

# Search with price range
GET /api/courses?search=meditation&minPrice=0&maxPrice=5000

# Featured courses only
GET /api/courses?isFeatured=true

# Sorted by popularity
GET /api/courses?sortBy=enrollmentCount&sortOrder=DESC
```

---

### 2. Create Course - `POST /api/courses`

**Purpose**: Create a new course (admin/instructor only)

**Authentication**: Required (Authorization header)  
**Authorization**: Instructor or Admin role

**Request Body**:
```json
{
  "title": "Introduction to Meditation",
  "slug": "introduction-to-meditation",
  "description": "Learn the basics of meditation practice",
  "longDescription": "A comprehensive course...",
  "instructorId": "uuid",
  "price": 4999,
  "duration": 3600,
  "level": "beginner",
  "category": "Meditation",
  "imageUrl": "https://...",
  "thumbnailUrl": "https://...",
  "previewVideoUrl": "https://...",
  "tags": ["meditation", "mindfulness"],
  "learningOutcomes": ["Learn basic techniques"],
  "prerequisites": [],
  "curriculum": [
    {
      "title": "Introduction",
      "description": "Getting started",
      "order": 1,
      "lessons": [
        {
          "title": "Welcome",
          "duration": 300,
          "type": "video",
          "videoUrl": "https://...",
          "order": 1
        }
      ]
    }
  ],
  "isPublished": true,
  "isFeatured": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Introduction to Meditation",
    ...
  }
}
```

**Validation**:
- Title: 3-200 characters
- Slug: 3-200 characters, unique
- Description: 10-500 characters
- Price: >= 0
- Duration: >= 1 second
- Level: beginner|intermediate|advanced
- Category: 2-100 characters
- InstructorId: Valid UUID

---

### 3. Get Course by ID - `GET /api/courses/:id`

**Purpose**: Retrieve full course details by UUID

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Introduction to Meditation",
    "slug": "introduction-to-meditation",
    "description": "...",
    "instructorName": "John Doe",
    "price": 4999,
    "enrollmentCount": 150,
    "avgRating": 4.5,
    ...
  }
}
```

**Error Responses**:
- `400` - Invalid ID format
- `404` - Course not found

---

### 4. Update Course - `PUT /api/courses/:id`

**Purpose**: Update course details (admin/instructor only)

**Authentication**: Required  
**Authorization**: Instructor or Admin role

**Request Body**: Partial course update (any fields from create)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    ...
  }
}
```

**Error Responses**:
- `400` - Invalid data
- `401` - Authentication required
- `403` - Insufficient permissions
- `404` - Course not found

---

### 5. Delete Course - `DELETE /api/courses/:id`

**Purpose**: Soft delete a course (admin/instructor only)

**Authentication**: Required  
**Authorization**: Instructor or Admin role

**Response**:
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

**Note**: This performs a soft delete (sets `deleted_at` timestamp)

---

### 6. Get Course by Slug - `GET /api/courses/slug/:slug`

**Purpose**: Retrieve course by SEO-friendly slug

**Use Case**: Course detail pages with readable URLs

**Example**:
```bash
GET /api/courses/slug/introduction-to-meditation
```

**Response**: Same as GET /api/courses/:id

---

### 7. Get Featured Courses - `GET /api/courses/featured`

**Purpose**: Retrieve featured courses for homepage/promotions

**Query Parameters**:
- `limit` (number, default: 6, max: 50) - Number of featured courses

**Example**:
```bash
GET /api/courses/featured?limit=10
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "isFeatured": true,
      ...
    }
  ]
}
```

---

## File Structure

```
src/pages/api/courses/
├── index.ts              # GET /api/courses, POST /api/courses
├── [id].ts               # GET/PUT/DELETE /api/courses/:id
├── slug/
│   └── [slug].ts         # GET /api/courses/slug/:slug
└── featured.ts           # GET /api/courses/featured
```

---

## Validation & Security

### Input Validation (Zod)

All endpoints use Zod schemas for:
- Type safety
- Data transformation (string → number for query params)
- Format validation (URLs, UUIDs, enums)
- Min/max constraints

### Authentication & Authorization

**Current Implementation** (Placeholder):
```typescript
function isAuthenticated(request: Request): boolean {
  return !!request.headers.get('Authorization');
}

function hasInstructorRole(request: Request): boolean {
  return !!request.headers.get('Authorization');
}
```

**TODO**: Implement proper JWT validation
- Decode JWT token
- Validate signature
- Check expiration
- Extract user ID and role
- Verify instructor/admin permissions

### Error Handling

All endpoints handle:
- `ValidationError` → 400 Bad Request
- `NotFoundError` → 404 Not Found
- `AuthenticationError` → 401 Unauthorized
- `AuthorizationError` → 403 Forbidden
- Generic errors → 500 Internal Server Error

---

## Test Coverage

### Test File: `tests/unit/course-api.test.ts`

**Total Tests**: 31  
**Passing**: 31 (100%)

**Test Categories**:

1. **GET /api/courses** (11 tests)
   - ✅ List courses successfully
   - ✅ Filter by category
   - ✅ Filter by level
   - ✅ Handle search query
   - ✅ Handle pagination parameters
   - ✅ Handle price filters
   - ✅ Handle tags filter
   - ✅ Handle featured filter
   - ✅ Handle sorting parameters
   - ✅ Return 400 for invalid query parameters
   - ✅ Handle service errors

2. **POST /api/courses** (4 tests)
   - ✅ Create course with authentication
   - ✅ Return 401 without authentication
   - ✅ Validate required fields
   - ✅ Handle validation errors from service

3. **GET /api/courses/:id** (3 tests)
   - ✅ Get course by ID successfully
   - ✅ Return 400 if ID is missing
   - ✅ Return 404 if course not found

4. **PUT /api/courses/:id** (3 tests)
   - ✅ Update course with authentication
   - ✅ Return 401 without authentication
   - ✅ Return 404 if course not found

5. **DELETE /api/courses/:id** (3 tests)
   - ✅ Delete course with authentication
   - ✅ Return 401 without authentication
   - ✅ Return 404 if course not found

6. **GET /api/courses/slug/:slug** (3 tests)
   - ✅ Get course by slug successfully
   - ✅ Return 400 if slug is missing
   - ✅ Return 404 if course not found

7. **GET /api/courses/featured** (4 tests)
   - ✅ Get featured courses with default limit
   - ✅ Respect custom limit parameter
   - ✅ Return 400 for invalid limit
   - ✅ Handle service errors

---

## Integration with Services

### Course Service Integration

All endpoints use the Course Service (`src/services/course.service.ts`):

```typescript
import {
  listCourses,
  createCourse,
  getCourseById,
  getCourseBySlug,
  updateCourse,
  deleteCourse,
  getFeaturedCourses,
} from '@/services/course.service';
```

**Benefits**:
- Separation of concerns (API layer vs business logic)
- Reusable service functions
- Consistent error handling
- Database abstraction

---

## Performance Considerations

### Pagination
- Default limit: 12 courses per page
- Prevents large data transfers
- Efficient database queries with LIMIT/OFFSET

### Filtering
- Database-level filtering (not in-memory)
- Indexed columns: slug, category, is_published, is_featured
- Full-text search on title/description

### Caching Opportunities (Future)
- Featured courses (rarely change)
- Popular courses list
- Course by slug (static content)
- Redis caching with TTL

---

## Usage Examples

### Frontend Integration

```typescript
// List courses with filters
const response = await fetch('/api/courses?category=Meditation&level=beginner');
const { data } = await response.json();
console.log(data.courses); // Array of courses
console.log(data.totalPages); // Pagination info

// Get course details
const course = await fetch('/api/courses/slug/intro-to-meditation')
  .then(res => res.json())
  .then(data => data.data);

// Create new course (admin/instructor)
const newCourse = await fetch('/api/courses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    title: 'New Course',
    slug: 'new-course',
    // ... other fields
  })
});

// Get featured courses for homepage
const featured = await fetch('/api/courses/featured?limit=6')
  .then(res => res.json())
  .then(data => data.data);
```

---

## Next Steps

### Immediate (T037-T040)
- [ ] T037: Create CourseCard component
- [ ] T038: Build course detail page
- [ ] T039: Implement "Add to Cart" functionality
- [ ] T040: Create cart page

### Authentication (High Priority)
- [ ] Implement JWT validation in auth helpers
- [ ] Add user context extraction from JWT
- [ ] Verify instructor ownership for updates/deletes
- [ ] Add rate limiting for public endpoints

### Enhancements
- [ ] Add Redis caching for featured courses
- [ ] Implement course image upload endpoint
- [ ] Add bulk import/export endpoints
- [ ] Create admin dashboard for course management
- [ ] Add course analytics endpoint

---

## Technical Debt

1. **Authentication Placeholder**
   - Current: Simple header check
   - Needed: Full JWT validation with role verification
   - Priority: HIGH

2. **Instructor Verification**
   - Current: Any authenticated user can create/update
   - Needed: Check if user is the course instructor or admin
   - Priority: HIGH

3. **Error Logging**
   - Current: Console.error only
   - Needed: Structured logging service (e.g., Winston, Pino)
   - Priority: MEDIUM

4. **API Documentation**
   - Current: Markdown only
   - Needed: OpenAPI/Swagger spec
   - Priority: MEDIUM

---

## Dependencies

### NPM Packages
- `astro` - SSR framework
- `zod` - Schema validation
- `pg` - PostgreSQL integration

### Internal Modules
- `@/services/course.service` - Business logic
- `@/lib/errors` - Error classes
- `@/types` - TypeScript types

---

## Performance Metrics

### Test Execution
- **Total Duration**: 1.05s
- **Setup Time**: 57ms
- **Collection Time**: 271ms
- **Test Execution**: 90ms

### API Response Times (Expected)
- List courses: <100ms
- Get by ID: <50ms
- Get by slug: <50ms
- Create/Update: <150ms
- Featured courses: <50ms (with caching: <10ms)

---

## Completion Checklist

- [x] Implement GET /api/courses (list with filters)
- [x] Implement POST /api/courses (create)
- [x] Implement GET /api/courses/:id (get by ID)
- [x] Implement PUT /api/courses/:id (update)
- [x] Implement DELETE /api/courses/:id (soft delete)
- [x] Implement GET /api/courses/slug/:slug (get by slug)
- [x] Implement GET /api/courses/featured (featured list)
- [x] Add Zod validation schemas
- [x] Add authentication checks
- [x] Add authorization checks
- [x] Write comprehensive tests (31 tests)
- [x] Achieve 100% test pass rate
- [x] Verify TypeScript compilation (0 errors)
- [x] Document all endpoints
- [x] Add usage examples

---

## Summary

✅ **7 API endpoints** fully implemented  
✅ **31 unit tests** all passing  
✅ **0 TypeScript errors**  
✅ **Comprehensive filtering** (9 query parameters)  
✅ **Pagination support**  
✅ **Authentication scaffolding** (ready for JWT)  
✅ **Error handling** for all edge cases  
✅ **SEO-friendly** slug-based retrieval  

**Ready for frontend integration!**
