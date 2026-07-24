-- Add superadmin role to user_role enum
-- This adds 'superadmin' as the highest role in the system
-- Note: This must be committed before using the new value
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin' BEFORE 'admin';

-- Update johngathigia@gmail.com to superadmin in auth.users
-- This must run in a separate transaction after the enum is committed
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"superadmin"'::jsonb
)
WHERE email = 'johngathigia@gmail.com';
