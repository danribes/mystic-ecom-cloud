#!/bin/bash

# Database Setup Script using Neon SQL API
# This script executes the schema.sql file against the Neon database

NEON_HOST="ep-lucky-resonance-a9kni6bw-pooler.gwc.azure.neon.tech"
CONN_STRING="postgresql://neondb_owner:npg_6im8pgGVNCwA@${NEON_HOST}/neondb?sslmode=require"

echo "🗄️  Database Setup Script (Neon SQL API)"
echo "========================================="
echo ""
echo "Connecting to Neon PostgreSQL..."

# Test connection
result=$(curl -s -X POST "https://${NEON_HOST}/sql" \
  -H "Content-Type: application/json" \
  -H "Neon-Connection-String: ${CONN_STRING}" \
  -d '{"query": "SELECT NOW() as now, current_database() as db"}')

if echo "$result" | grep -q '"db":"neondb"'; then
  echo "✅ Connected to database: neondb"
  echo ""
else
  echo "❌ Connection failed: $result"
  exit 1
fi

execute_sql() {
  local sql="$1"
  local desc="$2"

  # Escape the SQL for JSON
  local escaped_sql=$(echo "$sql" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

  result=$(curl -s -X POST "https://${NEON_HOST}/sql" \
    -H "Content-Type: application/json" \
    -H "Neon-Connection-String: ${CONN_STRING}" \
    -d "{\"query\": \"${escaped_sql}\"}" 2>&1)

  if echo "$result" | grep -q '"error"'; then
    error_msg=$(echo "$result" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"//;s/"$//')
    if echo "$error_msg" | grep -qi "already exists\|duplicate"; then
      echo "   ⏭️  $desc (already exists)"
      return 0
    else
      echo "   ❌ $desc: $error_msg"
      return 1
    fi
  else
    echo "   ✅ $desc"
    return 0
  fi
}

echo "🚀 Executing schema..."
echo ""

# Execute schema in order
execute_sql "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"" "Enable UUID extension"

execute_sql "CREATE TYPE user_role AS ENUM ('user', 'admin')" "Create user_role enum"
execute_sql "CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded')" "Create order_status enum"
execute_sql "CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'attended')" "Create booking_status enum"
execute_sql "CREATE TYPE product_type AS ENUM ('pdf', 'audio', 'video', 'ebook')" "Create product_type enum"
execute_sql "CREATE TYPE video_status AS ENUM ('queued', 'inprogress', 'ready', 'error')" "Create video_status enum"

execute_sql "CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    whatsapp VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)" "Create users table"

execute_sql "CREATE INDEX idx_users_email ON users(email)" "Create idx_users_email"
execute_sql "CREATE INDEX idx_users_role ON users(role)" "Create idx_users_role"
execute_sql "CREATE INDEX idx_users_deleted_at ON users(deleted_at)" "Create idx_users_deleted_at"

execute_sql "CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
)" "Create password_reset_tokens table"

execute_sql "CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token)" "Create idx_password_reset_tokens_token"
execute_sql "CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)" "Create idx_password_reset_tokens_user_id"

execute_sql "CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    curriculum JSONB,
    duration_hours INTEGER,
    level VARCHAR(50),
    is_published BOOLEAN DEFAULT false,
    title_es VARCHAR(255),
    description_es TEXT,
    long_description_es TEXT,
    learning_outcomes_es TEXT[],
    prerequisites_es TEXT[],
    curriculum_es JSONB,
    preview_video_url VARCHAR(500),
    preview_video_id VARCHAR(255),
    preview_video_thumbnail VARCHAR(500),
    preview_video_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)" "Create courses table"

execute_sql "CREATE INDEX idx_courses_slug ON courses(slug)" "Create idx_courses_slug"
execute_sql "CREATE INDEX idx_courses_published ON courses(is_published)" "Create idx_courses_published"
execute_sql "CREATE INDEX idx_courses_deleted_at ON courses(deleted_at)" "Create idx_courses_deleted_at"

execute_sql "CREATE TABLE course_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id VARCHAR(255) NOT NULL,
    cloudflare_video_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER,
    thumbnail_url VARCHAR(500),
    status video_status DEFAULT 'queued',
    playback_hls_url VARCHAR(500),
    playback_dash_url VARCHAR(500),
    processing_progress INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_course_lesson UNIQUE(course_id, lesson_id)
)" "Create course_videos table"

execute_sql "CREATE INDEX idx_course_videos_course_id ON course_videos(course_id)" "Create idx_course_videos_course_id"
execute_sql "CREATE INDEX idx_course_videos_status ON course_videos(status)" "Create idx_course_videos_status"

execute_sql "CREATE TABLE digital_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    product_type product_type NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size_mb DECIMAL(10, 2),
    preview_url VARCHAR(500),
    image_url VARCHAR(500),
    download_limit INTEGER DEFAULT 3,
    is_published BOOLEAN DEFAULT false,
    title_es VARCHAR(255),
    description_es TEXT,
    long_description_es TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" "Create digital_products table"

execute_sql "CREATE INDEX idx_digital_products_slug ON digital_products(slug)" "Create idx_digital_products_slug"
execute_sql "CREATE INDEX idx_digital_products_type ON digital_products(product_type)" "Create idx_digital_products_type"

execute_sql "CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours INTEGER NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT NOT NULL,
    venue_city VARCHAR(100) NOT NULL,
    venue_country VARCHAR(100) NOT NULL,
    venue_lat DECIMAL(10, 8),
    venue_lng DECIMAL(11, 8),
    capacity INTEGER NOT NULL,
    available_spots INTEGER NOT NULL,
    image_url VARCHAR(500),
    is_published BOOLEAN DEFAULT false,
    title_es VARCHAR(255),
    description_es TEXT,
    long_description_es TEXT,
    venue_name_es VARCHAR(255),
    venue_address_es TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" "Create events table"

execute_sql "CREATE INDEX idx_events_slug ON events(slug)" "Create idx_events_slug"
execute_sql "CREATE INDEX idx_events_date ON events(event_date)" "Create idx_events_date"
execute_sql "CREATE INDEX idx_events_city ON events(venue_city)" "Create idx_events_city"

execute_sql "CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" "Create orders table"

execute_sql "CREATE INDEX idx_orders_user_id ON orders(user_id)" "Create idx_orders_user_id"
execute_sql "CREATE INDEX idx_orders_status ON orders(status)" "Create idx_orders_status"

execute_sql "CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    digital_product_id UUID REFERENCES digital_products(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" "Create order_items table"

execute_sql "CREATE INDEX idx_order_items_order_id ON order_items(order_id)" "Create idx_order_items_order_id"

execute_sql "CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    status booking_status DEFAULT 'pending',
    attendees INTEGER DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    whatsapp_notified BOOLEAN DEFAULT false,
    email_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
)" "Create bookings table"

execute_sql "CREATE INDEX idx_bookings_user_id ON bookings(user_id)" "Create idx_bookings_user_id"
execute_sql "CREATE INDEX idx_bookings_event_id ON bookings(event_id)" "Create idx_bookings_event_id"

execute_sql "CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    digital_product_id UUID REFERENCES digital_products(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" "Create cart_items table"

execute_sql "CREATE INDEX idx_cart_items_user_id ON cart_items(user_id)" "Create idx_cart_items_user_id"

execute_sql "CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
)" "Create reviews table"

execute_sql "CREATE INDEX idx_reviews_course_id ON reviews(course_id)" "Create idx_reviews_course_id"
execute_sql "CREATE INDEX idx_reviews_approved ON reviews(is_approved)" "Create idx_reviews_approved"

execute_sql "CREATE TABLE course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed_lessons JSONB DEFAULT '[]',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
)" "Create course_progress table"

execute_sql "CREATE INDEX idx_course_progress_user_id ON course_progress(user_id)" "Create idx_course_progress_user_id"

execute_sql "CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT false,
    time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    first_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id, lesson_id)
)" "Create lesson_progress table"

execute_sql "CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id)" "Create idx_lesson_progress_user_id"
execute_sql "CREATE INDEX idx_lesson_progress_course_id ON lesson_progress(course_id)" "Create idx_lesson_progress_course_id"

execute_sql "CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    digital_product_id UUID NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)" "Create download_logs table"

execute_sql "CREATE INDEX idx_download_logs_user_id ON download_logs(user_id)" "Create idx_download_logs_user_id"

# Insert default admin user
execute_sql "INSERT INTO users (email, password_hash, name, role) VALUES ('admin@spirituality.com', '\$2b\$10\$rCz8L5qF2vx3yqZ5H1V9.uF0qWjP6z5RY.8J.VGqL5qC8x9F.Y0QG', 'Admin User', 'admin') ON CONFLICT (email) DO NOTHING" "Insert admin user"

echo ""
echo "========================================="
echo "📊 Verifying tables..."

# List tables
result=$(curl -s -X POST "https://${NEON_HOST}/sql" \
  -H "Content-Type: application/json" \
  -H "Neon-Connection-String: ${CONN_STRING}" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_type = '\''BASE TABLE'\'' ORDER BY table_name"}')

echo ""
echo "📋 Created tables:"
echo "$result" | grep -o '"table_name":"[^"]*"' | sed 's/"table_name":"//;s/"$/   - /'

echo ""
echo "🎉 Database setup completed!"
