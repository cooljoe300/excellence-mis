-- Make johngathigia@gmail.com an admin
-- This migration updates the user's role to admin in the profiles table

UPDATE profiles
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'johngathigia@gmail.com';
