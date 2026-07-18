DROP POLICY IF EXISTS "Admins view all sessions" ON public.qr_attendance_sessions;
CREATE POLICY "Admins view all sessions" ON public.qr_attendance_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

DROP POLICY IF EXISTS "Admins view all mentorship" ON public.mentorship_requests;
CREATE POLICY "Admins view all mentorship" ON public.mentorship_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));