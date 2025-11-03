-- T175: Add Language Preference to User Profile
-- Migration to add preferred_language column to users table

-- Add preferred_language column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en' CHECK (preferred_language IN ('en', 'es'));

-- Create index for language preference queries
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Add comment to document the column
COMMENT ON COLUMN users.preferred_language IS 'User''s preferred language for emails and content (en=English, es=Spanish)';
