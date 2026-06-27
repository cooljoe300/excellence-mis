-- Students can register units but cannot deregister themselves; only staff/admin may remove enrollments

DROP POLICY IF EXISTS "Students can drop own enrollments" ON public.enrollments;
