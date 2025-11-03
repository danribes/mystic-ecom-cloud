# Project Constitution# Spirituality E-Commerce Platform Constitution



## Core Principles## Core Principles



### 1. Code Quality### I. User-Centric Design

- **TypeScript Strict Mode**: All code must pass strict type checkingThe platform serves spiritual seekers and practitioners. Every feature must:

- **Test Coverage**: Minimum 80% coverage for critical paths- Provide clear value to users on their spiritual journey

- **Linting**: Zero ESLint errors, warnings addressed- Maintain intuitive, accessible interfaces

- **Documentation**: All complex logic explained with comments- Support diverse spiritual backgrounds without bias

- Prioritize user experience over technical complexity

### 2. Security First

- **Authentication**: bcrypt for passwords, secure session management### II. Security & Privacy First (NON-NEGOTIABLE)

- **Authorization**: Role-based access control (RBAC)Spiritual content and user data are sacred. Security is mandatory:

- **Input Validation**: Zod schemas for all user inputs- All user data encrypted at rest and in transit

- **SQL Injection**: Parameterized queries only (postgres.js)- Payment processing via Stripe (PCI-DSS compliant)

- **XSS Protection**: Sanitize all user-generated content- Personal information minimization - collect only what's necessary

- **CSRF**: SameSite cookies, token validation- Regular security audits and vulnerability scanning

- **Secrets**: Never commit sensitive data, use environment variables- GDPR/privacy law compliance for international users



### 3. Testing Strategy### III. Performance & Reliability

- **Test-Driven Development**: Write tests before implementationUsers expect a smooth, professional experience:

- **Unit Tests**: Vitest for services and utilities- Page load times under 2 seconds

- **Integration Tests**: Test API endpoints with real database- 99.5% uptime minimum

- **E2E Tests**: Playwright for critical user flows- Mobile-first responsive design

- **Coverage**: Tests required for all new features- Graceful degradation for older devices/browsers

- Progressive enhancement approach

### 4. Performance

- **Database**: Indexed queries, connection pooling### IV. Content Quality & Integrity

- **Caching**: Redis for sessions and frequently accessed dataSpiritual content must maintain high standards:

- **Assets**: Optimized images, lazy loading- All courses/programs properly reviewed before publication

- **Build**: Tree-shaking, code splitting- Accurate descriptions, no misleading claims

- **Monitoring**: Track response times and error rates- Copyright compliance for all materials

- Clear instructor credentials and background

### 5. User Experience- User reviews/ratings to maintain quality

- **Accessibility**: WCAG 2.1 AA compliance

- **Responsive**: Mobile-first design### V. Scalability & Maintainability

- **Loading States**: Clear feedback for async operationsBuilt for growth from day one:

- **Error Messages**: User-friendly, actionable- Modular architecture (separate concerns)

- **Progressive Enhancement**: Core functionality without JavaScript- Docker containerization for consistent deployment

- Clean, documented code following best practices

---- Comprehensive error logging and monitoring

- Database optimization for performance at scale

## Development Workflow

## Technical Standards

### 1. Task Management

- All work tracked in `.specify/memory/tasks.md`### Technology Stack

- Tasks prefixed with `T###` for reference- **Framework**: Astro (static-first, islands architecture)

- Implementation logged in `logs/T###-description.log.md`- **Database**: PostgreSQL in Docker (relational data, ACID compliance)

- Tests named `tests/unit/T###-description.test.ts`- **Cache/Queue**: Redis in Docker (session management, job queues)

- **Payment**: Stripe (subscriptions, one-time payments)

### 2. Git Workflow- **Notifications**: Twilio WhatsApp API, SendGrid/Resend (email)

- **Branching**: Feature branches from main- **Media**: Cloud storage for videos/audio (S3 or equivalent)

- **Commits**: Conventional commits (feat, fix, docs, test, refactor)- **Maps**: Google Maps/Mapbox for venue locations

- **Pull Requests**: Required for all changes

- **Code Review**: Peer review before merge### Code Quality Requirements

- **CI/CD**: Automated testing on push- TypeScript for type safety where possible

- ESLint + Prettier for consistent formatting

### 3. Code Standards- Comprehensive JSDoc comments for all functions

```typescript- Unit tests for business logic (70%+ coverage)

// File structure- Integration tests for critical user flows

src/- API endpoint documentation (OpenAPI/Swagger)

  lib/          // Services and utilities

  pages/        // Astro pages and API routes### Testing Strategy

  components/   // Reusable components- **Unit Tests**: All utility functions, business logic

  layouts/      // Page layouts- **Integration Tests**: Payment flows, user registration, course enrollment

  types/        // TypeScript definitions- **E2E Tests**: Critical user journeys (browse → purchase → access)

- **Manual Testing**: UX validation, accessibility checks

// Naming conventions- **Test Data**: Stripe test mode, mock WhatsApp notifications in dev

- Files: kebab-case.ts

- Components: PascalCase.astro## Development Workflow

- Functions: camelCase

- Constants: UPPER_SNAKE_CASE### Phase-Based Development

- Types/Interfaces: PascalCaseFollowing the 5-phase roadmap in PRD:

```- **Phase 1 (Weeks 1-6)**: MVP - Core e-commerce + online courses

- **Phase 2 (Weeks 7-12)**: On-site courses + booking system

### 4. Testing Standards- **Phase 3 (Weeks 13-18)**: Community + subscriptions

```typescript- **Phase 4 (Weeks 19-24)**: Advanced features (podcast, certifications)

// Test structure- **Phase 5 (Weeks 25-26)**: Testing, refinement, launch prep

describe('Module/Feature', () => {

  beforeEach(() => {### Git Workflow

    // Setup- **Main branch**: Production-ready code only

  });- **Develop branch**: Integration branch for features

- **Feature branches**: `feature/description` format

  it('should handle success case', async () => {- **Commit messages**: Conventional Commits format

    // Arrange- **Pull requests**: Required for all changes, minimum 1 reviewer

    // Act

    // Assert### Deployment Strategy

  });- **Development**: Local Docker environment

- **Staging**: Cloud deployment for testing (matches production)

  it('should handle error case', async () => {- **Production**: Zero-downtime deployments, rollback capability

    // Test error handling- **Database migrations**: Reversible, tested in staging first

  });- **Monitoring**: Error tracking (Sentry), performance monitoring (New Relic/Datadog)

});

```## Business Requirements



### 5. Documentation Requirements### Accessibility

- **README**: Project overview and setup instructions- WCAG 2.1 AA compliance minimum

- **API Docs**: Endpoint specifications- Keyboard navigation support

- **Learning Guides**: Architectural decisions explained- Screen reader compatibility

- **Code Comments**: Complex logic clarified- Color contrast ratios met

- **Logs**: Implementation details preserved- Alt text for all images



---### Multi-Language Support (Future)

- Architecture ready for internationalization (i18n)

## Technology Decisions- UTF-8 encoding throughout

- Placeholder for translation system

### Why Astro?

- **SSR Support**: Server-side rendering for dynamic content### Legal Compliance

- **TypeScript First**: Native TypeScript support- Terms of Service clearly displayed

- **Performance**: Fast builds, minimal JavaScript- Privacy Policy (GDPR compliant)

- **Flexibility**: Mix components from any framework- Cookie consent mechanism

- **API Routes**: Built-in server endpoints- Refund policy for courses/events

- Cancellation policies for on-site courses

### Why PostgreSQL?

- **Reliability**: ACID compliance, data integrity## Governance

- **Features**: Full-text search, JSON support, complex queries

- **Scalability**: Handles millions of recordsThis constitution guides all development decisions. When conflicts arise:

- **Community**: Mature ecosystem, excellent documentation1. Security/privacy concerns override all other considerations

2. User experience takes precedence over developer convenience

### Why Redis?3. Sustainable code quality over rapid feature delivery

- **Speed**: In-memory storage for sessions4. Business value validated before technical investment

- **TTL Support**: Automatic session expiration

- **Data Structures**: Supports complex types**Amendments**: Require documentation of rationale and impact assessment.

- **Persistence**: Optional disk persistence

**Version**: 1.0.0 | **Ratified**: 2025-10-30 | **Last Amended**: 2025-10-30

### Why Stripe?

- **Reliability**: Industry-leading payment processor

- **Security**: PCI compliance handled
- **Features**: Subscriptions, webhooks, refunds
- **Developer Experience**: Excellent API and documentation

### Why Vitest?
- **Speed**: Faster than Jest (ESM native)
- **Compatibility**: Vite-powered, works with Astro
- **Features**: Snapshots, mocking, coverage
- **DX**: Great error messages, watch mode

---

## Anti-Patterns to Avoid

### Code Smells
- ❌ **God Objects**: Keep services focused and single-purpose
- ❌ **Magic Numbers**: Use named constants
- ❌ **Callback Hell**: Use async/await
- ❌ **Copy-Paste**: Extract reusable utilities
- ❌ **Over-Engineering**: YAGNI (You Ain't Gonna Need It)

### Security Mistakes
- ❌ **Trusting User Input**: Always validate and sanitize
- ❌ **Exposing Errors**: Log details, show generic messages
- ❌ **Weak Passwords**: Enforce strong password policies
- ❌ **Insecure Sessions**: HttpOnly, Secure, SameSite cookies
- ❌ **SQL Concatenation**: Use parameterized queries

### Testing Pitfalls
- ❌ **Testing Implementation**: Test behavior, not internals
- ❌ **Flaky Tests**: Ensure deterministic results
- ❌ **Incomplete Coverage**: Test edge cases and errors
- ❌ **Slow Tests**: Mock external dependencies
- ❌ **Unclear Tests**: Use descriptive test names

---

## Best Practices

### Database
- ✅ Use transactions for multi-step operations
- ✅ Index foreign keys and commonly queried columns
- ✅ Connection pooling for performance
- ✅ Migrations for schema changes
- ✅ Soft deletes for audit trails

### API Design
- ✅ RESTful conventions (GET, POST, PUT, DELETE)
- ✅ Consistent response structure
- ✅ Proper HTTP status codes
- ✅ Rate limiting on public endpoints
- ✅ Pagination for list endpoints

### Error Handling
- ✅ Try-catch blocks for async operations
- ✅ Specific error types (not generic Error)
- ✅ Logging with context (request ID, user ID)
- ✅ Graceful degradation
- ✅ User-friendly error messages

### State Management
- ✅ Server-side sessions for auth state
- ✅ Redis for shared state across requests
- ✅ Database for persistent state
- ✅ Local storage for client preferences
- ✅ URL parameters for shareable state

---

## Code Review Checklist

### Before Submitting
- [ ] All tests passing
- [ ] No linting errors
- [ ] TypeScript compiles without errors
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Environment variables documented
- [ ] Logs removed or set to appropriate level

### Reviewer Checks
- [ ] Code meets quality standards
- [ ] Tests cover new functionality
- [ ] Security considerations addressed
- [ ] Performance implications understood
- [ ] Error handling complete
- [ ] Accessible markup used
- [ ] Responsive design implemented

---

## Maintenance Guidelines

### Regular Tasks
- **Daily**: Monitor error logs, review test results
- **Weekly**: Update dependencies, security patches
- **Monthly**: Review performance metrics, optimize slow queries
- **Quarterly**: Audit access controls, update documentation

### Dependency Updates
- Test updates in development first
- Review changelogs for breaking changes
- Update lockfile and test thoroughly
- Document any code changes required

### Database Maintenance
- Regular backups (automated)
- Index optimization
- Vacuum and analyze
- Monitor query performance
- Archive old data

---

## Emergency Procedures

### Production Issues
1. Assess severity (critical, high, medium, low)
2. Notify stakeholders if user-facing
3. Roll back if possible
4. Fix in development branch
5. Test thoroughly
6. Deploy fix
7. Post-mortem analysis

### Security Incidents
1. Isolate affected systems
2. Preserve evidence (logs)
3. Patch vulnerability
4. Notify affected users
5. Review and improve processes
6. Document incident

---

## Success Criteria

### MVP Launch Ready
- [ ] All Phase 3 tasks complete (T001-T052)
- [ ] Payment flow fully tested
- [ ] Email notifications working
- [ ] User dashboard functional
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation complete

### Quality Metrics
- Test Coverage: >80%
- Build Time: <30 seconds
- Test Execution: <10 seconds
- API Response: <200ms (p95)
- Lighthouse Score: >90 (mobile)
- Zero critical security issues

---

This constitution evolves with the project. All team members are empowered to propose improvements through documented discussions.
