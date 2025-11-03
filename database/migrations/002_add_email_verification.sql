-- Migration: Add email verification fields to users table
-- Date: 2025-10-31

-- Add email verification fields
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN email_verification_token VARCHAR(255),
ADD COLUMN email_verification_expires TIMESTAMP WITH TIME ZONE;

-- Create index for verification token lookups
CREATE INDEX idx_users_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Create index for verified status
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Add comment
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.email_verification_token IS 'Token sent via email for verification';
COMMENT ON COLUMN users.email_verification_expires IS 'Expiration time for verification token (24 hours)';
