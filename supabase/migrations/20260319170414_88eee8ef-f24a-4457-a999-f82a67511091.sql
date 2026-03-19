
-- Substitute allocations table
CREATE TABLE public.substitute_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id uuid REFERENCES public.faculty_leaves(id) ON DELETE CASCADE NOT NULL,
  original_faculty_id uuid REFERENCES public.faculty(id) NOT NULL,
  substitute_faculty_id uuid REFERENCES public.faculty(id) NOT NULL,
  date date NOT NULL,
  hour_number integer NOT NULL,
  section text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  assigned_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.substitute_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage substitutes" ON public.substitute_allocations FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Faculty can view own substitutes" ON public.substitute_allocations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM faculty f WHERE f.user_id = auth.uid() AND (f.id = substitute_allocations.original_faculty_id OR f.id = substitute_allocations.substitute_faculty_id))
);

-- Absence reports table (tutor classifies absences)
CREATE TABLE public.absence_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  tutor_id uuid REFERENCES public.faculty(id) NOT NULL,
  date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'uninformed',
  reason text DEFAULT NULL,
  hours_absent integer[] DEFAULT '{}',
  reported_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.absence_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage absence reports" ON public.absence_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Tutors can manage absence reports" ON public.absence_reports FOR ALL TO authenticated USING (is_tutor(auth.uid())) WITH CHECK (is_tutor(auth.uid()));
CREATE POLICY "Students can view own absence reports" ON public.absence_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = absence_reports.student_id AND s.user_id = auth.uid())
);

-- Student activities table
CREATE TABLE public.student_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'course',
  description text DEFAULT NULL,
  event_date date NOT NULL,
  proof_url text DEFAULT NULL,
  proof_file_name text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified_by uuid REFERENCES public.faculty(id) DEFAULT NULL,
  verified_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own activities" ON public.student_activities FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_activities.student_id AND s.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_activities.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Faculty can view activities" ON public.student_activities FOR SELECT TO authenticated USING (is_faculty(auth.uid()));
CREATE POLICY "Tutors can manage activities" ON public.student_activities FOR ALL TO authenticated USING (is_tutor(auth.uid())) WITH CHECK (is_tutor(auth.uid()));
CREATE POLICY "Admins can manage activities" ON public.student_activities FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- Weekly reports table
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  activities_count integer DEFAULT 0,
  attendance_percentage numeric DEFAULT 0,
  tutor_comments text DEFAULT NULL,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage weekly reports" ON public.weekly_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Tutors can manage weekly reports" ON public.weekly_reports FOR ALL TO authenticated USING (is_tutor(auth.uid())) WITH CHECK (is_tutor(auth.uid()));
CREATE POLICY "Students can view own reports" ON public.weekly_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = weekly_reports.student_id AND s.user_id = auth.uid())
);

-- Allow faculty to insert announcements
CREATE POLICY "Faculty can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (is_faculty(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX idx_absence_reports_date ON public.absence_reports(date);
CREATE INDEX idx_substitute_allocations_date ON public.substitute_allocations(date);
CREATE INDEX idx_student_activities_student ON public.student_activities(student_id);
CREATE INDEX idx_weekly_reports_student_week ON public.weekly_reports(student_id, week_start);
