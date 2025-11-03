# Spirituality E-Commerce Platform

A multilingual e-commerce platform for spiritual courses, events, and digital products with full English/Spanish support.

## 🌟 Features

- **Multilingual Support**: Full English/Spanish localization with i18n utilities
- **E-Commerce**: Courses, events, and digital products management
- **User Management**: Authentication with role-based access control (user/admin)
- **Translation Management**: Admin interface for managing Spanish translations
- **SEO Optimized**: Hreflang tags, structured data (JSON-LD), localized meta tags
- **Payment Processing**: Stripe integration (ready for implementation)
- **Responsive Design**: Tailwind CSS for mobile-first UI
- **Type-Safe**: Full TypeScript implementation
- **Well-Tested**: Comprehensive test coverage with Vitest

## 🚀 Tech Stack

- **Framework**: Astro 4.x with SSR
- **Language**: TypeScript
- **Database**: PostgreSQL with UUID primary keys
- **Caching**: Redis for sessions
- **Styling**: Tailwind CSS
- **Testing**: Vitest + Playwright (E2E)
- **Authentication**: JWT-based auth
- **Payments**: Stripe (configured, not yet implemented)

## 📁 Project Structure

```
/
├── src/
│   ├── components/          # Reusable Astro components
│   │   ├── SEOHead.astro
│   │   ├── TranslationEditor.astro
│   │   └── TranslationStatusBadge.astro
│   ├── i18n/                # Internationalization
│   │   ├── locales/         # Translation files (en.json, es.json)
│   │   └── index.ts         # i18n utilities
│   ├── lib/                 # Business logic libraries
│   │   ├── db.ts            # Database connection
│   │   ├── seoMetadata.ts   # SEO helpers
│   │   └── translationManager.ts  # Translation management
│   ├── middleware/          # Astro middleware
│   │   └── i18n.ts          # Language detection
│   └── pages/               # Astro pages (routes)
├── database/
│   └── schema.sql           # PostgreSQL schema
├── tests/
│   ├── unit/                # Unit tests
│   └── e2e/                 # End-to-end tests
├── docs/
│   └── DEPLOYMENT.md        # Deployment guide
├── log_files/               # Implementation logs
├── log_tests/               # Test result logs
└── log_learn/               # Learning guides
```

## 🧞 Commands

All commands are run from the root of the project:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Install dependencies                            |
| `npm run dev`             | Start local dev server at `localhost:4321`      |
| `npm run build`           | Build production site to `./dist/`              |
| `npm run preview`         | Preview build locally before deploying          |
| `npm test`                | Run all tests with Vitest                       |
| `npm run test:ui`         | Run tests with UI                               |
| `npm run test:e2e`        | Run end-to-end tests with Playwright            |
| `npm run astro ...`       | Run Astro CLI commands                          |

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spirituality_db

# Redis (for sessions/caching)
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-random-secure-string-min-32-chars

# Stripe (Payment Processing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Setup Database

```bash
# Create PostgreSQL database
createdb spirituality_db

# Run schema
psql spirituality_db < database/schema.sql
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:4321

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/T176_translation_management.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Test Coverage

- **T125**: i18n utilities - 18/18 tests passing ✅
- **T176**: Translation management - 37/37 tests passing ✅
- **T177**: SEO metadata - 26/26 tests passing ✅
- More tests available in `tests/unit/` directory

## 🌐 Internationalization (i18n)

The platform supports English and Spanish:

- **URL Structure**: `/` (English), `/es/` (Spanish)
- **Language Detection**: Automatic via `Accept-Language` header
- **Translation Files**: `src/i18n/locales/en.json` and `es.json`
- **Admin Translation Interface**: Manage content translations via admin panel

### Adding a New Language

1. Create translation file: `src/i18n/locales/[locale].json`
2. Add locale to `src/i18n/index.ts`:
   ```typescript
   export const locales = ['en', 'es', 'fr'] as const;
   ```
3. Update database schema with `*_[locale]` columns if needed

## 📚 Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)**: How to publish to GitHub and deploy to production
- **Implementation Logs**: See `log_files/` for detailed implementation notes
- **Test Logs**: See `log_tests/` for test results and analysis
- **Learning Guides**: See `log_learn/` for educational guides

## 🚢 Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for complete deployment instructions including:

- Publishing to GitHub
- Deploying to Vercel, Netlify, or VPS
- Environment variable configuration
- Database migrations
- CI/CD with GitHub Actions
- Monitoring and rollback procedures

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🗂️ Database Schema

The platform uses PostgreSQL with the following main tables:

- **users**: User accounts with role-based access
- **courses**: Educational courses with multilingual content
- **events**: Workshops and gatherings
- **digital_products**: PDFs, audio, video, ebooks
- **orders**: Purchase orders
- **bookings**: Event bookings

All content tables support Spanish translations via `*_es` columns (e.g., `title_es`, `description_es`).

## 🔐 Authentication

- JWT-based authentication
- Role-based access control (user/admin)
- Password hashing with bcrypt
- Session management via Redis

Default admin account (⚠️ **CHANGE IN PRODUCTION**):
- Email: `admin@spirituality.com`
- Password: `admin123`

## 💳 Payments (Stripe)

Stripe integration is configured but not yet fully implemented. To complete:

1. Add Stripe keys to `.env`
2. Implement checkout flow in `src/pages/api/checkout.ts`
3. Add webhook handler for payment events
4. Test with Stripe test cards

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes with tests
3. Ensure all tests pass: `npm test`
4. Commit with descriptive messages
5. Push and create a Pull Request

## 📝 Tasks & Progress

See `.specify/memory/tasks.md` for detailed task tracking including:
- ✅ Completed features (T176, T177, etc.)
- ⏳ In-progress work
- 📋 Planned enhancements

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql $DATABASE_URL
```

### Port Already in Use

```bash
# Kill process on port 4321
lsof -ti:4321 | xargs kill -9
```

### Test Failures

```bash
# Clear test cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --reporter=verbose
```

## 📞 Support

For issues or questions:
- Check documentation in `docs/` directory
- Review learning guides in `log_learn/`
- Create an issue in the GitHub repository

## 📄 License

[Your License Here - e.g., MIT, proprietary, etc.]

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0
**Maintained By**: Development Team
