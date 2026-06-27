-- Student passport photos for ID cards (Supabase Storage)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Students upload own photo'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students upload own photo" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'student-photos'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.students WHERE profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Students update own photo'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students update own photo" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'student-photos'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.students WHERE profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff manage student photos'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff manage student photos" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'student-photos' AND is_staff_or_admin())
      WITH CHECK (bucket_id = 'student-photos' AND is_staff_or_admin())
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read student photos'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read student photos" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'student-photos')
    $policy$;
  END IF;
END $$;
