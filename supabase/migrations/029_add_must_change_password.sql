-- Add must_change_password column to profiles table
-- This flag forces users to change their password on first login
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
