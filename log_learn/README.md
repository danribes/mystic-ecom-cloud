# Learning Guide: Spirituality E-Commerce Platform

This directory contains didactic explanations of how each task was implemented and why specific technical decisions were made.

## Purpose

This guide is designed to help developers understand:
- **What** was implemented in each task
- **Why** specific technologies and patterns were chosen
- **How** the implementation works under the hood
- **Best practices** and lessons learned

## Structure

The guides are organized by development phase, matching the project's task structure:

### Phase 1: Project Setup & Infrastructure
- [T001-T003: Initial Setup](./phase1-setup.md) - Project initialization and dependencies
- [T004-T012: Configuration](./phase1-configuration.md) - TypeScript, testing, and tooling

### Phase 2: Foundational Infrastructure
- [T013-T017: Database & Caching](./phase2-database-redis.md) - PostgreSQL and Redis setup
- [T018-T021: Authentication & Sessions](./phase2-auth-sessions.md) - Security fundamentals
- [T022-T028: Layouts & Error Handling](./phase2-layouts-errors.md) - UI structure and error management

### Phase 3: User Story 1 - Browse & Purchase Courses
- [T029-T031: Test-Driven Development](./phase3-tdd.md) - Writing tests first
- [T032-T035: Services Layer](./phase3-services.md) - Business logic implementation
- [T036-T039: Course Pages](./phase3-course-pages.md) - Frontend components
- [T040-T045: Cart & Checkout](./phase3-cart-checkout.md) - Shopping cart implementation

### Phase 4: User Story 2 - User Account Management
- [T053-T059: Authentication System](./phase4-authentication.md) - Registration, login, logout, and security
- [T060: Email Verification](./phase4-email-verification.md) - Token generation and verification flow
- [T061-T062: Profile Management](./phase4-profile-management.md) - User profile updates and password changes

## How to Use This Guide

1. **Sequential Learning**: Read the guides in order to understand the project's evolution
2. **Reference Material**: Use as a reference when working on similar features
3. **Code Review**: Compare the explanations with the actual implementation
4. **Best Practices**: Learn patterns that can be applied to other projects

## Key Concepts Covered

- **Full-Stack Architecture**: Astro SSR, TypeScript, PostgreSQL, Redis
- **Authentication**: Session management, password hashing, middleware
- **API Design**: RESTful endpoints, validation, error handling
- **Testing Strategy**: Unit tests, integration tests, TDD methodology
- **Frontend Patterns**: Component composition, state management, responsive design
- **Database Design**: Schema design, relationships, migrations
- **Payment Integration**: Stripe checkout, webhooks, security

## Prerequisites

To get the most from these guides, you should have:
- Basic JavaScript/TypeScript knowledge
- Understanding of web fundamentals (HTTP, REST APIs)
- Familiarity with React/component-based frameworks
- Basic SQL knowledge

## Contributing

If you find areas that need clarification or have suggestions for improvements, please update the relevant guide.

---

**Last Updated**: October 31, 2025  
**Status**: Covers tasks T001-T062 (Phase 1-4 complete)
