/**
 * Migration: Add Base English Content Fields
 * Task: T168
 * Date: 2025-11-02
 *
 * Purpose: Add base English language fields that were missing from the original schema
 * and are needed alongside the Spanish translations added in T167.
 *
 * These fields store the "default" English content:
 * - learning_outcomes: Learning objectives in English
 * - prerequisites: Course requirements in English
 * - long_description: Detailed course description in English
 *
 * The Spanish equivalents (*_es) were added in T167.
 */

-- ==================== COURSES TABLE ====================

-- Add base English content fields
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[],
  ADD COLUMN IF NOT EXISTS prerequisites TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN courses.long_description IS 'Detailed course description in English (default language)';
COMMENT ON COLUMN courses.learning_outcomes IS 'Array of learning outcomes in English (default language)';
COMMENT ON COLUMN courses.prerequisites IS 'Array of prerequisites in English (default language)';

-- ==================== VERIFICATION ====================

-- Verify the migration
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- Check that all required columns exist
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'courses'
    AND column_name IN ('long_description', 'learning_outcomes', 'prerequisites');

  -- Raise notice with results
  RAISE NOTICE 'Migration T168 (004) Verification:';
  RAISE NOTICE '  - Courses table: % base English columns verified', column_count;

  -- Assert all columns were created
  IF column_count < 3 THEN
    RAISE EXCEPTION 'Courses table migration incomplete: expected 3 columns, found %', column_count;
  END IF;

  RAISE NOTICE 'Migration T168 (004) completed successfully!';
END $$;
