/**
 * Migration: Add Base English Content Field for Events
 * Task: T169
 * Date: 2025-11-02
 *
 * Purpose: Add base English language field for long_description
 * that was missing from the original schema and is needed alongside
 * the Spanish translation added in T167.
 */

-- ==================== EVENTS TABLE ====================

-- Add base English content field
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS long_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.long_description IS 'Detailed event description in English (default language)';

-- ==================== VERIFICATION ====================

-- Verify the migration
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check that the column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'long_description'
  ) INTO column_exists;

  -- Raise notice with results
  RAISE NOTICE 'Migration T169 (005) Verification:';

  IF column_exists THEN
    RAISE NOTICE '  - Events table: long_description column verified';
    RAISE NOTICE 'Migration T169 (005) completed successfully!';
  ELSE
    RAISE EXCEPTION 'Events table migration incomplete: long_description column not found';
  END IF;
END $$;
