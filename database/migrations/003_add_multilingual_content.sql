/**
 * Migration: Add Multilingual Content Support
 * Task: T167
 * Date: 2025-11-02
 *
 * Purpose: Add Spanish language fields to courses, events, and products tables
 * to support multilingual content storage.
 *
 * Strategy: Column-based approach (title_es, description_es, etc.)
 * - Simpler queries (no JOINs needed)
 * - Better performance for read operations
 * - Easier to add more languages later
 * - NULL allowed (default to English if Spanish not provided)
 */

-- ==================== COURSES TABLE ====================

-- Add Spanish language columns to courses table
ALTER TABLE courses
  ADD COLUMN title_es VARCHAR(255),
  ADD COLUMN description_es TEXT,
  ADD COLUMN long_description_es TEXT,
  ADD COLUMN learning_outcomes_es TEXT[], -- Array of Spanish learning outcomes
  ADD COLUMN prerequisites_es TEXT[], -- Array of Spanish prerequisites
  ADD COLUMN curriculum_es JSONB; -- Spanish version of curriculum structure

-- Add comments for documentation
COMMENT ON COLUMN courses.title_es IS 'Spanish translation of course title';
COMMENT ON COLUMN courses.description_es IS 'Spanish translation of course short description';
COMMENT ON COLUMN courses.long_description_es IS 'Spanish translation of course detailed description';
COMMENT ON COLUMN courses.learning_outcomes_es IS 'Spanish translations of learning outcomes';
COMMENT ON COLUMN courses.prerequisites_es IS 'Spanish translations of prerequisites';
COMMENT ON COLUMN courses.curriculum_es IS 'Spanish version of course curriculum (sections and lessons)';

-- ==================== EVENTS TABLE ====================

-- Add Spanish language columns to events table
ALTER TABLE events
  ADD COLUMN title_es VARCHAR(255),
  ADD COLUMN description_es TEXT,
  ADD COLUMN long_description_es TEXT,
  ADD COLUMN venue_name_es VARCHAR(255), -- Spanish venue name
  ADD COLUMN venue_address_es TEXT; -- Spanish venue address

-- Add comments for documentation
COMMENT ON COLUMN events.title_es IS 'Spanish translation of event title';
COMMENT ON COLUMN events.description_es IS 'Spanish translation of event short description';
COMMENT ON COLUMN events.long_description_es IS 'Spanish translation of event detailed description';
COMMENT ON COLUMN events.venue_name_es IS 'Spanish translation of venue name';
COMMENT ON COLUMN events.venue_address_es IS 'Spanish translation of venue address';

-- ==================== DIGITAL PRODUCTS TABLE ====================

-- Add Spanish language columns to digital_products table
ALTER TABLE digital_products
  ADD COLUMN title_es VARCHAR(255),
  ADD COLUMN description_es TEXT,
  ADD COLUMN long_description_es TEXT;

-- Add comments for documentation
COMMENT ON COLUMN digital_products.title_es IS 'Spanish translation of product title';
COMMENT ON COLUMN digital_products.description_es IS 'Spanish translation of product short description';
COMMENT ON COLUMN digital_products.long_description_es IS 'Spanish translation of product detailed description';

-- ==================== INDEXES ====================

-- Add indexes for Spanish content searches (optional, for future full-text search)
-- These can be added when implementing search functionality for Spanish content
-- CREATE INDEX idx_courses_title_es_gin ON courses USING gin(to_tsvector('spanish', title_es));
-- CREATE INDEX idx_events_title_es_gin ON events USING gin(to_tsvector('spanish', title_es));
-- CREATE INDEX idx_digital_products_title_es_gin ON digital_products USING gin(to_tsvector('spanish', title_es));

-- ==================== SAMPLE DATA (for development/testing) ====================

-- Update existing courses with sample Spanish translations
-- This is optional and can be removed for production

UPDATE courses
SET
  title_es = CASE
    WHEN title LIKE '%Meditation%' THEN REPLACE(title, 'Meditation', 'Meditación')
    WHEN title LIKE '%Mindfulness%' THEN REPLACE(title, 'Mindfulness', 'Atención Plena')
    WHEN title LIKE '%Yoga%' THEN title -- Yoga is same in Spanish
    WHEN title LIKE '%Spiritual%' THEN REPLACE(title, 'Spiritual', 'Espiritual')
    ELSE title || ' (ES)'
  END,
  description_es = description || ' [Versión en español]'
WHERE title IS NOT NULL;

-- ==================== VERIFICATION ====================

-- Verify the migration
DO $$
DECLARE
  courses_count INTEGER;
  events_count INTEGER;
  products_count INTEGER;
BEGIN
  -- Check courses table
  SELECT COUNT(*) INTO courses_count
  FROM information_schema.columns
  WHERE table_name = 'courses'
    AND column_name IN ('title_es', 'description_es', 'curriculum_es');

  -- Check events table
  SELECT COUNT(*) INTO events_count
  FROM information_schema.columns
  WHERE table_name = 'events'
    AND column_name IN ('title_es', 'description_es', 'venue_name_es');

  -- Check products table
  SELECT COUNT(*) INTO products_count
  FROM information_schema.columns
  WHERE table_name = 'digital_products'
    AND column_name IN ('title_es', 'description_es');

  -- Raise notice with results
  RAISE NOTICE 'Migration T167 Verification:';
  RAISE NOTICE '  - Courses table: % Spanish columns added', courses_count;
  RAISE NOTICE '  - Events table: % Spanish columns added', events_count;
  RAISE NOTICE '  - Products table: % Spanish columns added', products_count;

  -- Assert all columns were created
  IF courses_count < 6 THEN
    RAISE EXCEPTION 'Courses table migration incomplete: expected 6 columns, found %', courses_count;
  END IF;

  IF events_count < 5 THEN
    RAISE EXCEPTION 'Events table migration incomplete: expected 5 columns, found %', events_count;
  END IF;

  IF products_count < 3 THEN
    RAISE EXCEPTION 'Products table migration incomplete: expected 3 columns, found %', products_count;
  END IF;

  RAISE NOTICE 'Migration T167 completed successfully!';
END $$;
