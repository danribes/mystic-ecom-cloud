# Development Plan# Implementation Plan: Spirituality E-Commerce Platform



## Current Sprint: Phase 3 - User Story 1 (Payment Integration)**Branch**: `main` | **Date**: 2025-10-30 | **Spec**: `.specify/memory/spec.md`

**Input**: Feature specification from `.specify/memory/spec.md`

### Active Task: T046 - Stripe Checkout Session Endpoint

## Summary

**Priority**: HIGH  

**Status**: Ready to implement  Build a comprehensive spirituality e-commerce platform that enables users to discover, purchase, and access online courses, digital products, and on-site spiritual events. The platform uses modern web technologies with Astro framework for performance, PostgreSQL for data persistence, and integrates with Stripe for payments and Twilio for notifications.

**Blocked By**: None (all dependencies complete)

## Technical Context

#### Objective

Create POST endpoint at `/api/checkout/create-session.ts` to initialize Stripe payment flow.**Language/Version**: JavaScript/TypeScript (Node.js 20 LTS), Astro 4.x  

**Primary Dependencies**: 

#### Requirements- Astro (static site generator with SSR)

- Accept cart items and customer email- PostgreSQL 15+ (relational database)

- Create Stripe checkout session- Redis 7+ (caching, session management)

- Return session ID and URL- Stripe SDK (payment processing)

- Handle errors gracefully- Twilio WhatsApp API (notifications)

- SendGrid/Resend (email delivery)

#### Dependencies- bcrypt (password hashing)

- ✅ T036: Stripe service (complete)

- ✅ T040: Cart service (complete)**Storage**: PostgreSQL in Docker container with persistent volumes  

- ✅ T045: Checkout page (complete)**Testing**: Vitest for unit tests, Playwright for E2E, Stripe test mode for payments  

**Target Platform**: Web (responsive design, mobile-first)  

---**Project Type**: Web application (Astro frontend + API routes)  

**Performance Goals**: 

## Upcoming Tasks (In Order)- <2s page load time (First Contentful Paint)

- <200ms API response time (p95)

### T047: Stripe Webhook Handler- Support 100 concurrent users on single instance

**Priority**: HIGH  - 99.5% uptime SLA

**Status**: Blocked by T046  

**Estimate**: 2-3 hours**Constraints**: 

- PCI-DSS compliance via Stripe (no card data storage)

- Create webhook endpoint at `/api/checkout/webhook.ts`- GDPR compliance for user data

- Verify webhook signatures- WCAG 2.1 AA accessibility

- Handle `payment_intent.succeeded` events- Mobile-first responsive design

- Create order records

- Send confirmation emails**Scale/Scope**: 

- Clear user cart- Initial launch: 50-100 courses, 500-1000 users

- Year 1 target: 200+ courses, 5000+ users, 50+ events

### T048: Email Service Integration- 5 development phases over 26 weeks

**Priority**: HIGH  

**Status**: Blocked by T046  ## Constitution Check

**Estimate**: 1-2 hours

✅ **User-Centric Design**: Spec includes 7 user stories prioritized by user value  

- Implement SendGrid/Resend integration✅ **Security & Privacy First**: Stripe integration, bcrypt password hashing, HTTPS required  

- Configure email templates✅ **Performance & Reliability**: Performance goals defined, Docker for consistent deployment  

- Add retry logic✅ **Content Quality**: Admin approval workflow included for reviews  

- Error handling and logging✅ **Scalability & Maintainability**: Modular architecture, comprehensive testing strategy  

✅ **Technical Standards**: TypeScript for type safety, ESLint/Prettier, test coverage targets  

### T049: Order Confirmation Email✅ **Phase-Based Development**: 5-phase roadmap aligned with constitution  

**Priority**: HIGH  

**Status**: Blocked by T048  *All constitution requirements satisfied. No violations to justify.*

**Estimate**: 1 hour

## Project Structure

- Design email template

- Include order details### Documentation (this feature)

- Add payment confirmation

- Include access instructions```text

.specify/

### T050: User Dashboard Page├── memory/

**Priority**: MEDIUM  │   ├── constitution.md    # Project principles & standards

**Status**: Blocked by T047  │   ├── spec.md           # This specification

**Estimate**: 3-4 hours│   └── plan.md           # This implementation plan

├── scripts/

- Create dashboard layout│   └── bash/             # Automation scripts

- Display purchased courses└── templates/            # Spec Kit templates

- Show order history```

- Access digital content

### Source Code (repository root)

---

```text

## Phase Completion Strategy# Web Application Structure (Astro + API)



### Phase 3 Completion Criteria/

- [x] All services tested (T029-T031)├── src/

- [x] Course browsing implemented (T032-T035)│   ├── pages/                    # Astro pages (routes)

- [x] Cart functionality complete (T038-T042)│   │   ├── index.astro          # Homepage

- [x] Checkout page ready (T043-T045)│   │   ├── courses/

- [ ] Payment processing working (T046-T047)│   │   │   ├── index.astro      # Course catalog

- [ ] Email notifications sent (T048-T049)│   │   │   └── [id].astro       # Course detail

- [ ] User dashboard accessible (T050-T052)│   │   ├── events/

│   │   │   ├── index.astro      # Events catalog

### Phase 4 Preview: User Account Management│   │   │   └── [id].astro       # Event detail

- Login/logout functionality│   │   ├── products/

- User profile editing│   │   │   ├── index.astro      # Digital products

- Password reset flow│   │   │   └── [id].astro       # Product detail

- Session management│   │   ├── cart.astro           # Shopping cart

- Protected routes│   │   ├── checkout.astro       # Checkout flow

│   │   ├── login.astro          # User login

---│   │   ├── register.astro       # User registration

│   │   ├── dashboard/

## Technical Debt & Improvements│   │   │   ├── index.astro      # User dashboard

│   │   │   ├── courses.astro    # My courses

### Current│   │   │   └── downloads.astro  # My downloads

- None identified (clean implementation)│   │   └── admin/

│   │       ├── index.astro      # Admin dashboard

### Future Considerations│   │       ├── courses/         # Course management

1. **Performance**: Add caching layer for course listings│   │       ├── events/          # Event management

2. **Security**: Implement rate limiting on API endpoints│   │       └── orders.astro     # Order management

3. **UX**: Add loading states and optimistic updates│   │

4. **Testing**: Add E2E tests with Playwright│   ├── api/                     # API routes (server endpoints)

5. **Monitoring**: Add error tracking (Sentry)│   │   ├── auth/

6. **SEO**: Optimize meta tags and structured data│   │   │   ├── register.ts      # POST /api/auth/register

│   │   │   ├── login.ts         # POST /api/auth/login

---│   │   │   └── logout.ts        # POST /api/auth/logout

│   │   ├── cart/

## Risk Management│   │   │   ├── add.ts           # POST /api/cart/add

│   │   │   ├── remove.ts        # DELETE /api/cart/remove

### High Priority Risks│   │   │   └── index.ts         # GET /api/cart

1. **Stripe Webhook Security**: Must verify signatures properly│   │   ├── checkout/

   - Mitigation: Use Stripe's official verification methods│   │   │   ├── create-session.ts    # POST /api/checkout/create-session

   │   │   │   └── webhook.ts           # POST /api/checkout/webhook (Stripe)

2. **Email Delivery**: SendGrid could fail│   │   └── admin/

   - Mitigation: Implement retry logic and fallback notifications│   │       ├── courses.ts       # CRUD for courses

│   │       ├── events.ts        # CRUD for events

3. **Race Conditions**: Cart clearing vs order creation│   │       └── orders.ts        # GET orders

   - Mitigation: Use database transactions│   │

│   ├── components/              # Reusable UI components

### Medium Priority Risks│   │   ├── Header.astro

1. **Session Expiry**: Users lose cart items│   │   ├── Footer.astro

   - Mitigation: Extended session TTL, warning messages│   │   ├── CourseCard.astro

│   │   ├── EventCard.astro

2. **Payment Errors**: User charged but order not created│   │   ├── ProductCard.astro

   - Mitigation: Idempotency keys, webhook retry handling│   │   └── CartItem.astro

│   │

---│   ├── lib/                     # Core business logic

│   │   ├── db.ts               # PostgreSQL connection

## Sprint Velocity│   │   ├── redis.ts            # Redis connection

│   │   ├── auth.ts             # Authentication utilities

### Completed (Last 7 Days)│   │   ├── cart.ts             # Cart service

- T029-T031: Test suite (3 tasks) ✅│   │   ├── courses.ts          # Course service

- T032-T037: Course services and API (6 tasks) ✅│   │   ├── events.ts           # Event service

- T038-T042: Cart implementation (5 tasks) ✅│   │   ├── products.ts         # Product service

- T043-T045: Checkout page (3 tasks) ✅│   │   ├── orders.ts           # Order service

│   │   ├── stripe.ts           # Stripe integration

**Total**: 17 tasks completed│   │   ├── twilio.ts           # WhatsApp notifications

│   │   └── email.ts            # Email notifications

### This Sprint (Next 3-5 Days)│   │

- T046-T052: Payment and dashboard (7 tasks)│   ├── layouts/                # Page layouts

│   │   ├── BaseLayout.astro    # Main layout

**Estimated**: 12-16 hours of development│   │   ├── DashboardLayout.astro

│   │   └── AdminLayout.astro

---│   │

│   └── styles/                 # Global styles

## Resource Allocation│       └── global.css

│

### Current Team├── tests/

- 1 Full-stack Developer│   ├── unit/                   # Unit tests (Vitest)

- AI Assistant (Claude) for architecture guidance│   │   ├── auth.test.ts

│   │   ├── cart.test.ts

### Time Commitment│   │   └── services.test.ts

- ~4-6 hours per day│   ├── integration/            # Integration tests

- 5-7 days per week│   │   ├── checkout.test.ts

│   │   └── booking.test.ts

### Tools & Services│   └── e2e/                    # End-to-end tests (Playwright)

- GitHub (version control)│       ├── purchase-flow.spec.ts

- Docker (local development)│       ├── event-booking.spec.ts

- Stripe Test Mode (payment testing)│       └── admin-flow.spec.ts

- SendGrid Sandbox (email testing)│

├── database/

---│   ├── schema.sql              # Database schema

│   ├── migrations/             # Database migrations

## Next Steps│   └── seeds/                  # Seed data for development

│

1. **Immediate** (Today):├── docker/

   - Implement T046: Stripe checkout session endpoint│   ├── docker-compose.yml      # Docker services definition

   - Write tests for checkout session creation│   └── postgres/

   - Test integration with checkout page│       └── init.sql            # DB initialization

│

2. **Short-term** (Next 2 Days):├── public/                     # Static assets

   - Implement T047: Webhook handler│   ├── images/

   - Implement T048-T049: Email notifications│   └── uploads/                # User-uploaded content

   - End-to-end payment flow testing│

├── .env                        # Environment variables (gitignored)

3. **Medium-term** (Next 5 Days):├── .env.example                # Environment template

   - Complete T050-T052: User dashboard├── astro.config.mjs            # Astro configuration

   - Phase 3 testing and refinement├── tsconfig.json               # TypeScript configuration

   - Begin Phase 4 planning├── vitest.config.ts            # Vitest configuration

├── playwright.config.ts        # Playwright configuration

---├── package.json                # Dependencies

└── README.md                   # Project documentation

## Success Metrics```



### Phase 3 Goals**Structure Decision**: Web application structure selected because this is a full-stack e-commerce platform with:

- ✅ 100% test coverage for services- Public-facing pages (Astro pages for SSG/SSR)

- ✅ Zero breaking changes to existing features- API endpoints for dynamic operations (authentication, payments, bookings)

- 🔄 Complete payment flow (in progress)- Admin interface for content management

- 🔄 Email notifications working (pending)- Clear separation of concerns (pages, components, services, lib)

- 🔄 User can access purchased content (pending)

## Development Phases

### Technical Metrics

- Tests: 443 passing (target: maintain 100%)### Phase 1: MVP - Core E-Commerce (Weeks 1-6) - PRIORITY 1

- Build time: <30 seconds

- Test execution: <5 seconds**User Stories**: P1 stories (Browse/Purchase Courses, User Accounts, Admin Management)

- API response time: <200ms (target)

**Deliverables**:
- Docker setup (PostgreSQL, Redis)
- Database schema with migrations
- User authentication system (register, login, sessions)
- Course catalog and detail pages
- Shopping cart functionality
- Stripe checkout integration
- Order confirmation emails
- Admin dashboard for course management
- Basic responsive design

**Success Criteria**: Users can browse courses, create accounts, purchase courses via Stripe, and access purchased content. Admins can create and manage courses.

---

### Phase 2: On-Site Events System (Weeks 7-12) - PRIORITY 2

**User Stories**: P2 on-site events

**Deliverables**:
- Event management system
- Venue address with Google Maps integration
- Capacity tracking and overbooking prevention
- Event booking flow
- WhatsApp notifications (Twilio integration)
- Event confirmation emails with venue details
- Admin event management interface

**Success Criteria**: Users can discover events by location/date, book events with real-time capacity checking, and receive confirmations via email and WhatsApp.

---

### Phase 3: Digital Products & Search (Weeks 13-18) - PRIORITY 2

**User Stories**: P2 digital products, P2 search/filter

**Deliverables**:
- Digital product upload and management
- Secure download link generation
- Product catalog with filtering
- Search functionality (courses, products, events)
- Advanced filtering (category, price, date)
- Download tracking and analytics
- Enhanced admin analytics dashboard

**Success Criteria**: Users can purchase and download digital products, search across all content types, and filter results effectively.

---

### Phase 4: Community Features (Weeks 19-24) - PRIORITY 3

**User Stories**: P3 reviews/ratings, additional features from PRD

**Deliverables**:
- User review and rating system
- Review moderation for admins
- Course progress tracking
- User profile enhancement
- Podcast integration (if in PRD)
- Multi-language preparation (i18n structure)

**Success Criteria**: Verified purchasers can leave reviews, average ratings display on content, users can track learning progress.

---

### Phase 5: Testing, Optimization & Launch (Weeks 25-26)

**Deliverables**:
- Comprehensive E2E test suite
- Performance optimization (caching, CDN)
- Security audit and penetration testing
- Accessibility audit (WCAG 2.1 AA)
- Load testing (100+ concurrent users)
- Production deployment preparation
- Documentation finalization
- User acceptance testing (UAT)

**Success Criteria**: All success criteria from spec.md met, production-ready deployment, 99.5% uptime during test period.

## Technical Architecture

### Database Schema (PostgreSQL)

**Core Tables**:
- `users` - User accounts and authentication
- `courses` - Online course catalog
- `digital_products` - Downloadable products
- `events` - On-site events with venues
- `orders` - Purchase transactions
- `order_items` - Items within orders
- `bookings` - Event reservations
- `cart_items` - Shopping cart contents
- `reviews` - User reviews and ratings (Phase 4)
- `course_progress` - User learning progress (Phase 4)

### API Endpoints

**Public**:
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Course details
- `GET /api/events` - List events
- `GET /api/products` - List digital products
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

**Authenticated**:
- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add to cart
- `DELETE /api/cart/remove` - Remove from cart
- `POST /api/checkout/create-session` - Create Stripe session
- `POST /api/checkout/webhook` - Stripe webhook handler

**Admin Only**:
- `POST /api/admin/courses` - Create course
- `PUT /api/admin/courses/:id` - Update course
- `DELETE /api/admin/courses/:id` - Delete course
- `GET /api/admin/orders` - List all orders
- `POST /api/admin/events` - Create event

### External Integrations

1. **Stripe** - Payment processing, subscriptions
2. **Twilio WhatsApp** - Event booking notifications
3. **SendGrid/Resend** - Transactional emails
4. **Google Maps/Mapbox** - Venue location display
5. **Cloud Storage** (Phase 2+) - Video hosting for courses

### Security Measures

- HTTPS enforced (production)
- Password hashing with bcrypt (10+ rounds)
- HTTP-only secure cookies for sessions
- CSRF protection on forms
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection (Astro built-in escaping)

## Testing Strategy

**Unit Tests (Vitest)**:
- Authentication functions
- Cart calculations
- Service layer methods
- Utility functions
- Target: 70% code coverage

**Integration Tests**:
- Database operations
- Stripe payment flow
- Email/WhatsApp notifications
- API endpoint responses

**E2E Tests (Playwright)**:
- Complete purchase flow (browse → cart → checkout → confirmation)
- Event booking flow
- Admin content management
- User registration and login

**Manual Testing**:
- Accessibility (screen readers, keyboard navigation)
- Cross-browser compatibility
- Mobile responsiveness
- Payment flow with test cards

## Deployment Strategy

**Development**:
- Docker Compose for local development
- Hot reload with Astro dev server
- PostgreSQL and Redis in containers

**Staging**:
- Cloud deployment (Vercel/Netlify for Astro + managed PostgreSQL)
- Mirrors production environment
- Stripe test mode enabled

**Production**:
- Zero-downtime deployments
- Database migration strategy (backward compatible)
- Environment-based configuration
- Monitoring and logging (Sentry for errors)
- Automated backups (database snapshots)

## Next Steps

1. **Review this plan** - Validate technical decisions and architecture
2. **Run `/speckit.tasks`** - Generate detailed task breakdown from this plan
3. **Environment setup** - Initialize repository, Docker configuration
4. **Phase 1 kickoff** - Begin MVP development
