#!/bin/bash
#
# Database Import Script for Neon PostgreSQL
# This script imports your database schema and runs migrations
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it first:"
    echo '  export DATABASE_URL="postgresql://user:pass@your-project.neon.tech/main?sslmode=require"'
    echo ""
    exit 1
fi

print_info "Starting database import to Neon PostgreSQL..."
echo ""

# Test connection
print_info "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Failed to connect to database"
    echo ""
    echo "Please check:"
    echo "  1. DATABASE_URL is correct"
    echo "  2. Database is not suspended in Neon dashboard"
    echo "  3. Connection string includes ?sslmode=require"
    exit 1
fi

echo ""

# Import main schema
print_info "Importing main schema (database/schema.sql)..."
if psql "$DATABASE_URL" -f database/schema.sql > /dev/null 2>&1; then
    print_success "Main schema imported successfully"
else
    print_warning "Schema import may have failed or already exists"
    print_info "Continuing with migrations..."
fi

echo ""

# Run migrations in order
print_info "Running database migrations..."
echo ""

MIGRATIONS=(
    "001_fix_cascade_deletes.sql"
    "002_add_email_verification.sql"
    "003_add_analytics_tables.sql"
    "003_add_multilingual_content.sql"
    "004_add_base_content_fields.sql"
    "005_add_event_base_content_fields.sql"
    "006_add_product_base_content_fields.sql"
    "007_add_user_language_preference.sql"
    "008_add_password_reset_tokens.sql"
    "009_add_video_storage_metadata.sql"
    "010_add_performance_indexes.sql"
    "010_add_video_analytics.sql"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    migration_file="database/migrations/$migration"

    if [ -f "$migration_file" ]; then
        print_info "Running migration: $migration"

        if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
            print_success "  ✓ $migration applied successfully"
            ((SUCCESS_COUNT++))
        else
            print_warning "  ⚠ $migration may have failed or already applied"
            ((FAIL_COUNT++))
        fi
    else
        print_warning "  ⚠ Migration file not found: $migration"
        ((FAIL_COUNT++))
    fi
done

echo ""
print_info "Migration summary:"
echo "  Successful: $SUCCESS_COUNT"
echo "  Warnings: $FAIL_COUNT"

echo ""

# Check if we should import seed data
read -p "$(echo -e ${YELLOW}?${NC} Do you want to import development seed data? [y/N]: )" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "database/seeds/dev.sql" ]; then
        print_info "Importing seed data..."
        if psql "$DATABASE_URL" -f database/seeds/dev.sql > /dev/null 2>&1; then
            print_success "Seed data imported successfully"
        else
            print_warning "Seed data import may have failed"
        fi
    else
        print_warning "Seed file not found: database/seeds/dev.sql"
    fi
else
    print_info "Skipping seed data import"
fi

echo ""

# Verify installation
print_info "Verifying database setup..."

# Check for key tables
TABLES=("users" "courses" "products" "orders")
MISSING_TABLES=()

for table in "${TABLES[@]}"; do
    if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
        print_success "  ✓ Table '$table' exists and is accessible"
    else
        print_error "  ✗ Table '$table' not found or not accessible"
        MISSING_TABLES+=("$table")
    fi
done

echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    print_success "Database setup completed successfully! 🎉"
    echo ""
    print_info "Next steps:"
    echo "  1. Add DATABASE_URL to Cloudflare Pages environment variables"
    echo "  2. Test your application locally with this database"
    echo "  3. Continue with Cloudflare deployment"
else
    print_error "Some tables are missing. Database setup may be incomplete."
    echo ""
    print_info "Missing tables: ${MISSING_TABLES[*]}"
    echo ""
    echo "You may need to:"
    echo "  1. Review error messages above"
    echo "  2. Check if tables exist with different names"
    echo "  3. Re-run the import script"
fi

echo ""
print_info "Database connection string (save this for Cloudflare):"
echo "$DATABASE_URL"
echo ""
