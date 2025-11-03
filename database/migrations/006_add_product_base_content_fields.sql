/**
 * Migration: Add Base English Content Field for Digital Products
 * Task: T170
 * Date: 2025-11-02
 *
 * Purpose: Add base English language field for long_description
 * that was missing from the original schema and is needed alongside
 * the Spanish translation added in T167.
 */

-- ==================== DIGITAL PRODUCTS TABLE ====================

-- Add base English content field
ALTER TABLE digital_products
  ADD COLUMN IF NOT EXISTS long_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN digital_products.long_description IS 'Detailed product description in English (default language)';

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
    WHERE table_name = 'digital_products'
      AND column_name = 'long_description'
  ) INTO column_exists;

  -- Raise notice with results
  RAISE NOTICE 'Migration T170 (006) Verification:';

  IF column_exists THEN
    RAISE NOTICE '  - Digital products table: long_description column verified';
    RAISE NOTICE 'Migration T170 (006) completed successfully!';
  ELSE
    RAISE EXCEPTION 'Digital products table migration incomplete: long_description column not found';
  END IF;
END $$;
