-- Fix: Remove default to 'staff' role in handle_new_user function
-- This prevents deleted student accounts from being reassigned as Staff on login

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  role_text TEXT;
  safe_role user_role;
  safe_full_name TEXT;
BEGIN
  role_text := NULLIF(NEW.raw_user_meta_data->>'role', '');
  
  -- Only create profile if role is explicitly provided and valid
  -- Do NOT default to 'staff' - this prevents unauthorized role assignment
  IF role_text IS NULL OR role_text NOT IN ('admin', 'staff', 'teacher', 'student') THEN
    -- Log the issue and return without creating profile
    -- The user will need to be assigned a role by an administrator
    RETURN NEW;
  END IF;
  
  safe_role := role_text::user_role;

  safe_full_name :=
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'User');

  BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      safe_full_name,
      safe_role
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block auth user creation if profile creation fails.
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION handle_new_user() SET search_path = public;
