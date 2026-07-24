-- Fix admission number generation to handle existing numbers and prevent duplicates
-- This updates the generate_admission_number() function to:
-- 1. Check if the generated admission number already exists in the students table
-- 2. If it exists, increment the counter and retry (up to 10 times)
-- 3. Only set the admission number after confirming uniqueness
-- 4. Handle race conditions gracefully

CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year_int integer;
  v_year text;
  v_yy text;
  v_seq integer;
  v_format text;
  v_number text;
  v_code text;
  v_retry_count integer;
  v_max_retries integer := 10;
  v_number_exists boolean;
BEGIN
  v_year_int := EXTRACT(YEAR FROM NOW())::integer;
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_yy := TO_CHAR(NOW(), 'YY');

  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    SELECT value INTO v_format
    FROM public.system_settings
    WHERE key = 'admission_number_format';

    IF v_format IS NULL OR btrim(v_format) = '' THEN
      v_format := 'EOC/{CODE}/{SEQ3}/{YY}';
    END IF;

    v_code := NULL;
    IF NEW.program_id IS NOT NULL THEN
      SELECT upper(COALESCE(NULLIF(btrim(admission_prefix), ''), NULLIF(btrim(code), '')))
      INTO v_code
      FROM public.programs
      WHERE id = NEW.program_id;
    END IF;

    IF v_code IS NULL OR v_code = '' THEN
      v_code := 'GEN';
    END IF;

    -- Retry loop to ensure unique admission number
    v_retry_count := 0;
    LOOP
      -- Get next sequence number
      v_seq := public.next_admission_seq(v_code, v_year_int);

      -- Generate admission number
      v_number := v_format;
      v_number := replace(v_number, '{YYYY}', v_year);
      v_number := replace(v_number, '{YY}', v_yy);
      v_number := replace(v_number, '{CODE}', v_code);
      v_number := replace(v_number, '{SEQ4}', lpad(v_seq::text, 4, '0'));
      v_number := replace(v_number, '{SEQ3}', lpad(v_seq::text, 3, '0'));
      v_number := replace(v_number, '{SEQ}', v_seq::text);

      -- Check if this number already exists
      SELECT EXISTS(
        SELECT 1 FROM public.students 
        WHERE admission_number = v_number
        LIMIT 1
      ) INTO v_number_exists;

      -- If number doesn't exist, we're done
      IF NOT v_number_exists THEN
        EXIT;
      END IF;

      -- Number exists, increment retry count
      v_retry_count := v_retry_count + 1;

      -- If we've exceeded max retries, raise an error
      IF v_retry_count >= v_max_retries THEN
        RAISE EXCEPTION 'Could not generate unique admission number after % attempts for program code % in year %', 
          v_max_retries, v_code, v_year_int;
      END IF;

      -- Number exists, the next_admission_seq will automatically increment on next call
      -- Continue the loop to try the next number
    END LOOP;

    NEW.admission_number := v_number;
    NEW.student_number := v_number;
  END IF;

  IF NEW.student_number IS NULL OR NEW.student_number = '' THEN
    NEW.student_number := NEW.admission_number;
  END IF;

  IF NEW.id_card_issued_at IS NULL THEN
    NEW.id_card_issued_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.generate_admission_number() SET search_path = public;

-- Add comment explaining the retry logic
COMMENT ON FUNCTION public.generate_admission_number() IS 
'Generates unique admission numbers with automatic retry logic to handle existing numbers. 
Checks the students table for collisions and retries up to 10 times to find a unique number.';
