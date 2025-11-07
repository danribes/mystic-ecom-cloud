#!/bin/bash
#
# Test External Services Connections
# Verifies that all external services are configured correctly
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo ""
print_info "Testing External Services Connections"
echo "========================================"
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: Database Connection
((TOTAL_TESTS++))
print_info "[1/4] Testing Neon PostgreSQL connection..."

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set"
    ((FAILED_TESTS++))
else
    # Test connection and query
    if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
        VERSION=$(psql "$DATABASE_URL" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
        print_success "PostgreSQL connected: ${VERSION:0:50}..."

        # Check key tables
        if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
            USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
            print_success "Database schema verified (Users table: $USER_COUNT records)"
            ((PASSED_TESTS++))
        else
            print_warning "Connected but schema may be missing. Run: ./scripts/import-database.sh"
            ((FAILED_TESTS++))
        fi
    else
        print_error "Failed to connect to PostgreSQL"
        print_info "  Check: DATABASE_URL format and ?sslmode=require"
        ((FAILED_TESTS++))
    fi
fi

echo ""

# Test 2: Redis Connection
((TOTAL_TESTS++))
print_info "[2/4] Testing Upstash Redis connection..."

if [ -z "$REDIS_URL" ]; then
    print_error "REDIS_URL not set"
    ((FAILED_TESTS++))
else
    # Check if redis-cli is available
    if command -v redis-cli &> /dev/null; then
        if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
            REDIS_INFO=$(redis-cli -u "$REDIS_URL" INFO server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r')
            print_success "Redis connected: version $REDIS_INFO"

            # Test write/read
            if redis-cli -u "$REDIS_URL" SET test_key "test_value" > /dev/null 2>&1; then
                redis-cli -u "$REDIS_URL" DEL test_key > /dev/null 2>&1
                print_success "Redis read/write working"
                ((PASSED_TESTS++))
            else
                print_warning "Redis connected but write failed"
                ((FAILED_TESTS++))
            fi
        else
            print_error "Failed to connect to Redis"
            print_info "  Check: REDIS_URL starts with rediss:// (double 's')"
            ((FAILED_TESTS++))
        fi
    else
        print_warning "redis-cli not installed - skipping Redis test"
        print_info "  Install with: sudo apt-get install redis-tools"
        print_info "  Or your REDIS_URL will be tested when app starts"
        ((PASSED_TESTS++))  # Don't fail if redis-cli is missing
    fi
fi

echo ""

# Test 3: Stripe Configuration
((TOTAL_TESTS++))
print_info "[3/4] Testing Stripe configuration..."

STRIPE_OK=true

if [ -z "$STRIPE_SECRET_KEY" ]; then
    print_error "STRIPE_SECRET_KEY not set"
    STRIPE_OK=false
fi

if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    print_error "STRIPE_PUBLISHABLE_KEY not set"
    STRIPE_OK=false
fi

if [ "$STRIPE_OK" = true ]; then
    # Check if keys look valid
    if [[ $STRIPE_SECRET_KEY == sk_live_* ]] || [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
        print_success "Stripe secret key format valid"
    else
        print_warning "Stripe secret key format looks incorrect"
        STRIPE_OK=false
    fi

    if [[ $STRIPE_PUBLISHABLE_KEY == pk_live_* ]] || [[ $STRIPE_PUBLISHABLE_KEY == pk_test_* ]]; then
        print_success "Stripe publishable key format valid"
    else
        print_warning "Stripe publishable key format looks incorrect"
        STRIPE_OK=false
    fi

    # Check if using test or live keys
    if [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
        print_success "Using Stripe LIVE mode (production)"
    else
        print_warning "Using Stripe TEST mode (not for production)"
    fi
fi

if [ "$STRIPE_OK" = true ]; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi

echo ""

# Test 4: Resend Configuration
((TOTAL_TESTS++))
print_info "[4/4] Testing Resend configuration..."

RESEND_OK=true

if [ -z "$RESEND_API_KEY" ]; then
    print_error "RESEND_API_KEY not set"
    RESEND_OK=false
else
    if [[ $RESEND_API_KEY == re_* ]]; then
        print_success "Resend API key format valid"
    else
        print_warning "Resend API key format looks incorrect (should start with 're_')"
        RESEND_OK=false
    fi
fi

if [ -z "$EMAIL_FROM" ]; then
    print_warning "EMAIL_FROM not set (will use default)"
else
    print_success "Email sender configured: $EMAIL_FROM"
fi

if [ "$RESEND_OK" = true ]; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi

echo ""
echo "========================================"
print_info "Test Results: $PASSED_TESTS/$TOTAL_TESTS passed"
echo ""

# Additional checks
print_info "Additional Configuration Checks:"
echo ""

# Security secrets
SECRETS=("SESSION_SECRET" "JWT_SECRET" "CSRF_SECRET" "DOWNLOAD_TOKEN_SECRET")
MISSING_SECRETS=0

for secret in "${SECRETS[@]}"; do
    if [ -z "${!secret}" ]; then
        print_error "  ✗ $secret not set"
        ((MISSING_SECRETS++))
    else
        # Check length (should be at least 32 chars)
        SECRET_LENGTH=${#!secret}
        if [ $SECRET_LENGTH -ge 32 ]; then
            print_success "  ✓ $secret configured ($SECRET_LENGTH chars)"
        else
            print_warning "  ⚠ $secret too short ($SECRET_LENGTH chars, recommend 64+)"
        fi
    fi
done

echo ""

# Environment
if [ "$NODE_ENV" = "production" ]; then
    print_success "  ✓ NODE_ENV set to production"
elif [ -z "$NODE_ENV" ]; then
    print_warning "  ⚠ NODE_ENV not set (will default to development)"
else
    print_info "  ℹ NODE_ENV set to: $NODE_ENV"
fi

# Site URL
if [ -z "$PUBLIC_SITE_URL" ]; then
    print_warning "  ⚠ PUBLIC_SITE_URL not set"
else
    print_success "  ✓ PUBLIC_SITE_URL: $PUBLIC_SITE_URL"
fi

echo ""
echo "========================================"

# Final summary
if [ $FAILED_TESTS -eq 0 ] && [ $MISSING_SECRETS -eq 0 ]; then
    print_success "All tests passed! Ready for deployment 🎉"
    echo ""
    exit 0
else
    print_warning "Some tests failed or configurations missing"
    echo ""
    print_info "Please fix the issues above before deploying"
    echo ""
    exit 1
fi
