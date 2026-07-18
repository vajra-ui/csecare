
-- QR Attendance Sessions
CREATE TABLE public.qr_attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  section public.section_type NOT NULL,
  subject TEXT NOT NULL,
  hour_number INTEGER NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_code TEXT NOT NULL,
  code_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_attendance_sessions TO authenticated;
GRANT ALL ON public.qr_attendance_sessions TO service_role;
ALTER TABLE public.qr_attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty manage own qr sessions"
ON public.qr_attendance_sessions FOR ALL
USING (faculty_id IN (SELECT id FROM public.faculty WHERE user_id = auth.uid()))
WITH CHECK (faculty_id IN (SELECT id FROM public.faculty WHERE user_id = auth.uid()));

CREATE POLICY "Students view active sessions in their section"
ON public.qr_attendance_sessions FOR SELECT
USING (
  is_active = true
  AND section IN (SELECT section FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all qr sessions"
ON public.qr_attendance_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Mentorship Requests
CREATE TABLE public.mentorship_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed')),
  alumni_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_requests TO authenticated;
GRANT ALL ON public.mentorship_requests TO service_role;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own mentorship requests"
ON public.mentorship_requests FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Alumni view requests to them"
ON public.mentorship_requests FOR SELECT
USING (alumni_id IN (
  SELECT a.id FROM public.alumni a
  JOIN auth.users u ON u.email = a.email
  WHERE u.id = auth.uid()
));

CREATE POLICY "Alumni respond to requests to them"
ON public.mentorship_requests FOR UPDATE
USING (alumni_id IN (
  SELECT a.id FROM public.alumni a
  JOIN auth.users u ON u.email = a.email
  WHERE u.id = auth.uid()
));

CREATE POLICY "Admins view all mentorship"
ON public.mentorship_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mentorship_updated_at
BEFORE UPDATE ON public.mentorship_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
