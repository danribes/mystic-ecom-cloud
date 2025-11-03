# Spirituality E-Commerce Platform# Feature Specification: Spirituality E-Commerce Platform



## Project Overview**Feature Branch**: `main`  

**Created**: 2025-10-30  

A comprehensive e-commerce platform for spiritual courses, events, and digital products built with Astro, TypeScript, PostgreSQL, and Redis.**Status**: Draft  

**Input**: Comprehensive spirituality e-commerce platform with online courses, digital products, and on-site events

## Technology Stack

## User Scenarios & Testing *(mandatory)*

### Frontend

- **Astro 5.x**: Modern web framework with SSR support### User Story 1 - Browse and Purchase Online Spiritual Course (Priority: P1)

- **TypeScript**: Strict type checking

- **Tailwind CSS**: Utility-first CSS frameworkA spiritual seeker visits the platform to find and purchase an online course on meditation, energy healing, or spiritual development.

- **Astro Components**: `.astro` component format

**Why this priority**: Core revenue-generating functionality. Without this, the platform has no value proposition.

### Backend

- **Node.js**: Runtime environment**Independent Test**: Can be fully tested by browsing catalog, adding course to cart, completing Stripe checkout, and receiving course access.

- **Astro API Routes**: Server-side endpoints

- **PostgreSQL**: Primary database**Acceptance Scenarios**:

- **Redis**: Session storage and caching

1. **Given** user visits homepage, **When** they click "Browse Courses", **Then** they see categorized list of available online courses with images, titles, prices, and ratings

### Payment & Services2. **Given** user views course detail page, **When** they click "Add to Cart", **Then** course is added to their shopping cart with visual confirmation

- **Stripe**: Payment processing3. **Given** user has items in cart, **When** they proceed to checkout and complete Stripe payment, **Then** payment is processed securely and user receives email confirmation with course access link

- **SendGrid**: Transactional emails4. **Given** user completes purchase, **When** they log into their account, **Then** purchased course appears in "My Courses" dashboard with immediate access

- **Twilio**: WhatsApp notifications

---

### Testing

- **Vitest**: Unit and integration testing### User Story 2 - User Account Management (Priority: P1)

- **Playwright**: End-to-end testing

- **@vitest/coverage-v8**: Code coverageUsers need to create accounts, log in securely, and manage their profile information and purchased content.



## Architecture**Why this priority**: Required for P1 (course purchases). Users need accounts to access purchased content and track their learning journey.



### Database Schema**Independent Test**: Can be tested by registering new account, logging in, updating profile, and viewing purchase history.

- **users**: User accounts with role-based access

- **courses**: Online course catalog**Acceptance Scenarios**:

- **orders**: Purchase records

- **order_items**: Individual items in orders1. **Given** new visitor, **When** they click "Sign Up" and provide email/password, **Then** account is created, password is securely hashed, and confirmation email is sent

- **cart_items**: Shopping cart storage2. **Given** registered user, **When** they enter correct credentials, **Then** they are logged in and redirected to their dashboard

- **events**: Physical event listings3. **Given** logged-in user, **When** they update profile information, **Then** changes are saved and reflected immediately

- **bookings**: Event reservations4. **Given** logged-in user, **When** they view "My Purchases", **Then** they see complete history of courses and products purchased with access links

- **digital_products**: Downloadable content

---

### Key Services

- **Auth Service** (`src/lib/auth.ts`): Password hashing, user management### User Story 3 - Book and Attend On-Site Spiritual Event (Priority: P2)

- **Session Service** (`src/lib/session.ts`): Redis-based session management

- **Course Service** (`src/lib/courses.ts`): Course CRUD operationsUsers can discover, book, and attend physical spiritual events and workshops at specific venues.

- **Cart Service** (`src/lib/cart.ts`): Shopping cart management

- **Order Service** (`src/lib/orders.ts`): Order processing**Why this priority**: Key differentiator from online-only platforms. Enables community building and higher-value offerings.

- **Stripe Service** (`src/lib/stripe.ts`): Payment integration

- **Email Service** (`src/lib/email.ts`): Transactional emails**Independent Test**: Can be tested by browsing events with date/location filters, booking event with capacity checking, receiving confirmation with venue details and Google Maps link.



### API Endpoints**Acceptance Scenarios**:

- **GET /api/courses**: List courses

- **GET /api/courses/[id]**: Course details1. **Given** user browses events, **When** they filter by location/date, **Then** they see available on-site events with venue addresses, dates, capacity, and prices

- **POST /api/cart/add**: Add to cart2. **Given** user views event detail, **When** event has available spots, **Then** they can see remaining capacity, venue map, and "Book Now" button

- **DELETE /api/cart/remove**: Remove from cart3. **Given** user books event, **When** they complete payment, **Then** booking is confirmed, capacity decreases, and they receive email + WhatsApp confirmation with venue details

- **GET /api/cart**: Get cart contents4. **Given** event is fully booked, **When** user views event, **Then** "Sold Out" status is displayed with waitlist option

- **POST /api/checkout/create-session**: Initialize payment

- **POST /api/checkout/webhook**: Handle Stripe events---



## Development Status### User Story 4 - Purchase Digital Spiritual Products (Priority: P2)



### Phase 1: Setup ✅ (T001-T012)Users can browse and purchase digital products like e-books, guided meditation audio, oracle card decks, and digital journals.

- Project initialized with Astro + TypeScript

- Docker configuration for PostgreSQL + Redis**Why this priority**: Additional revenue stream with zero marginal cost. Lower barrier to entry than full courses.

- Testing frameworks configured

- ESLint, Prettier, and Tailwind CSS setup**Independent Test**: Can be tested by purchasing digital product, receiving download link immediately, and accessing file.



### Phase 2: Infrastructure ✅ (T013-T028)**Acceptance Scenarios**:

- Database schema designed and implemented

- Authentication and session management1. **Given** user browses digital products, **When** they view product detail, **Then** they see clear description, file format, file size, and preview if applicable

- Base layouts and components2. **Given** user purchases digital product, **When** payment completes, **Then** they receive immediate download link via email and in account dashboard

- Error handling and utilities3. **Given** user has purchased digital product, **When** they access "My Downloads", **Then** they can re-download purchased files indefinitely



### Phase 3: User Story 1 🔄 (T029-T052)---

- **Complete**: T029-T045

  - Tests written for services### User Story 5 - Admin Product and Event Management (Priority: P1)

  - Course, cart, and order services implemented

  - Course pages and cart functionalityPlatform administrators need to create, update, and manage courses, digital products, and on-site events.

  - Checkout page with Tailwind CSS

  **Why this priority**: Required to populate the platform with content. Without admin capabilities, platform remains empty.

- **In Progress**: T046-T052

  - Stripe checkout session endpoint**Independent Test**: Can be tested by logging in as admin, creating new course with pricing, uploading content, and verifying it appears publicly.

  - Webhook handler

  - Email notifications**Acceptance Scenarios**:

  - User dashboard

1. **Given** admin is logged in, **When** they create new online course, **Then** they can set title, description, price, category, upload video/materials, and publish/unpublish

## Current Focus2. **Given** admin manages on-site events, **When** they create event, **Then** they can set venue address, capacity, date/time, price, and manage bookings

3. **Given** admin views orders, **When** they access orders dashboard, **Then** they see all purchases with user info, payment status, and can export to CSV

**Next Task: T046** - Create Stripe checkout session endpoint to initialize payment flow4. **Given** order is placed, **When** payment completes, **Then** admin receives email notification and WhatsApp message with order details



## Test Coverage---



- **Unit Tests**: 443 tests passing### User Story 6 - Search and Filter Spiritual Content (Priority: P2)

- **Test Files**: 10 files covering all major services and components

- **Coverage**: Services, API endpoints, component logicUsers can search courses, products, and events by keywords, categories, price range, and date to find relevant spiritual content quickly.



## Key Features Implemented**Why this priority**: Improves discoverability as catalog grows. Not essential for MVP but significantly enhances UX.



1. ✅ Course browsing and detail pages**Independent Test**: Can be tested by searching for specific term and verifying relevant results appear, filtered correctly.

2. ✅ Shopping cart functionality

3. ✅ Session-based cart for anonymous users**Acceptance Scenarios**:

4. ✅ Checkout page with order summary

5. ⏳ Stripe payment integration (in progress)1. **Given** user on any page, **When** they enter search term in header, **Then** results show matching courses, products, and events with relevance ranking

6. ⏳ Email notifications (pending)2. **Given** user browses catalog, **When** they apply filters (price, category, date), **Then** results update in real-time without page reload

7. ⏳ User dashboard (pending)3. **Given** search returns no results, **When** user views empty state, **Then** helpful suggestions are displayed



## Configuration Files---



- `.env.example`: Environment variable template### User Story 7 - User Reviews and Ratings (Priority: P3)

- `docker-compose.yml`: PostgreSQL and Redis services

- `astro.config.mjs`: Astro framework configurationVerified purchasers can leave reviews and ratings for courses and events they've completed, helping future users make informed decisions.

- `tailwind.config.mjs`: Tailwind CSS customization

- `vitest.config.ts`: Testing configuration**Why this priority**: Builds trust and social proof but not essential for initial launch. Can be added after establishing base user community.

- `playwright.config.ts`: E2E testing setup

- `tsconfig.json`: TypeScript strict mode**Independent Test**: Can be tested by completing course, leaving review with rating, and seeing review appear on course page.



## Documentation**Acceptance Scenarios**:



- **Learning Guides**: `learn/` directory with phase-by-phase explanations1. **Given** user has completed purchased course, **When** they submit review with rating, **Then** review appears on course page after admin approval

- **Implementation Logs**: `logs/` directory with detailed task completion notes2. **Given** user views course, **When** they see reviews, **Then** average rating and total review count are displayed prominently

- **Test Files**: Comprehensive test suites with examples3. **Given** admin reviews pending reviews, **When** they approve/reject, **Then** review status updates and user is notified



## Getting Started---



```bash### Edge Cases

# Install dependencies

npm install- What happens when user attempts to book event at full capacity? → Show "Sold Out" status, offer waitlist option

- How does system handle payment failures during checkout? → Return user to cart with error message, don't deduct inventory

# Start Docker services- What happens when user tries to access course they haven't purchased? → Show paywall with course preview and purchase button

docker-compose up -d- How does system handle venue address changes for booked events? → Email + WhatsApp notification to all attendees with updated details

- What happens when digital download link expires? → Allow re-generation of download link from user dashboard

# Run database migrations- How does system handle concurrent bookings for last event spot? → Use database transactions to prevent overbooking

npm run db:migrate- What happens when admin deletes course with active enrollments? → Soft delete - course hidden from catalog but accessible to existing purchasers

- How does system handle timezone differences for on-site events? → Store times in UTC, display in user's local timezone with venue's local time shown

# Start development server

npm run dev## Requirements *(mandatory)*



# Run tests### Functional Requirements

npm test

**Authentication & Authorization:**

# Build for production- **FR-001**: System MUST allow users to register with email and password

npm run build- **FR-002**: System MUST hash passwords using bcrypt (minimum 10 rounds)

```- **FR-003**: System MUST support password reset via email token

- **FR-004**: System MUST maintain user sessions using secure HTTP-only cookies

## Project Goals- **FR-005**: System MUST distinguish between regular users and admin users with role-based access



**MVP (Phases 1-3)**: Enable users to browse courses, add to cart, checkout, and access purchased content**Course Management:**

- **FR-006**: System MUST allow admins to create online courses with title, description, price, category, and media content

**Future Phases**:- **FR-007**: System MUST support video content for courses [NEEDS CLARIFICATION: video hosting platform - self-hosted or third-party like Vimeo?]

- User account management (Phase 4)- **FR-008**: System MUST allow admins to publish/unpublish courses

- Admin dashboard (Phase 5)- **FR-009**: System MUST display course catalog with filtering and sorting capabilities

- Event booking system (Phase 6)- **FR-010**: System MUST track course enrollment and progress per user

- Digital product downloads (Phase 7)

- Search and filtering (Phase 8)**E-Commerce:**

- Reviews and ratings (Phase 9)- **FR-011**: System MUST integrate Stripe for secure payment processing

- **FR-012**: System MUST support shopping cart functionality with add/remove items
- **FR-013**: System MUST calculate taxes based on user location [NEEDS CLARIFICATION: which jurisdictions require tax calculation?]
- **FR-014**: System MUST send order confirmation emails via SendGrid/Resend
- **FR-015**: System MUST store order history with payment status tracking

**On-Site Events:**
- **FR-016**: System MUST allow admins to create events with venue address, date/time, capacity, and price
- **FR-017**: System MUST track remaining capacity and prevent overbooking
- **FR-018**: System MUST integrate Google Maps/Mapbox for venue location display
- **FR-019**: System MUST send booking confirmations via email and WhatsApp (Twilio)
- **FR-020**: System MUST support event cancellation with refund processing

**Digital Products:**
- **FR-021**: System MUST allow admins to upload digital products (PDF, MP3, ZIP)
- **FR-022**: System MUST generate secure, time-limited download links for purchased products
- **FR-023**: System MUST allow unlimited re-downloads from user dashboard
- **FR-024**: System MUST track file downloads for analytics

**Admin Dashboard:**
- **FR-025**: System MUST provide admin dashboard with sales analytics
- **FR-026**: System MUST send real-time notifications to admin on new orders (email + WhatsApp)
- **FR-027**: System MUST allow admins to manage user accounts (view, suspend, delete)
- **FR-028**: System MUST provide order management with export to CSV functionality

### Key Entities

- **User**: Represents platform users (customers and admins). Attributes: id, email, password_hash, is_admin, created_at
- **Course**: Online spiritual course. Attributes: id, title, description, price, category, is_active, instructor_id
- **DigitalProduct**: Downloadable digital content. Attributes: id, name, description, price, file_url, file_size, format
- **Event**: On-site spiritual event. Attributes: id, title, description, venue_address, date, capacity, remaining_spots, price
- **Order**: Purchase transaction. Attributes: id, user_id, total_amount, stripe_payment_id, status, created_at
- **OrderItem**: Individual items in an order. Attributes: id, order_id, product_type, product_id, quantity, price
- **Booking**: Event reservation. Attributes: id, event_id, user_id, status, created_at
- **CartItem**: Shopping cart contents. Attributes: id, user_id, product_type, product_id, quantity

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete course purchase from discovery to enrollment in under 3 minutes
- **SC-002**: System processes 100 concurrent checkouts without performance degradation
- **SC-003**: 95% of payment transactions complete successfully on first attempt
- **SC-004**: Page load times remain under 2 seconds for all public pages
- **SC-005**: 90% of users successfully find desired course/product using search within 2 queries
- **SC-006**: Email and WhatsApp notifications delivered within 30 seconds of order placement
- **SC-007**: Zero overbooking incidents for on-site events
- **SC-008**: Admin can create and publish new course in under 10 minutes
- **SC-009**: Mobile users have equivalent functionality to desktop users
- **SC-010**: System maintains 99.5% uptime during business hours
