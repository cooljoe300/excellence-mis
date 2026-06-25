-- Fix: prevent "Database error saving new user" during signup/invite
-- Root cause: handle_new_user() can throw (e.g. invalid role enum cast).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  role_text TEXT;
  safe_role user_role;
  safe_full_name TEXT;
BEGIN
  role_text := NULLIF(NEW.raw_user_meta_data->>'role', '');
  safe_role := CASE
    WHEN role_text IN ('admin', 'staff', 'teacher', 'student') THEN role_text::user_role
    ELSE 'staff'::user_role
  END;

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

