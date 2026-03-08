
-- Faculty Leaves
CREATE TABLE public.faculty_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'casual',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.faculty(id),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faculty_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Faculty can manage own leaves" ON public.faculty_leaves FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM faculty f WHERE f.id = faculty_leaves.faculty_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM faculty f WHERE f.id = faculty_leaves.faculty_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins can manage all leaves" ON public.faculty_leaves FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- Class Notes
CREATE TABLE public.class_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text NOT NULL,
  section public.section_type NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Faculty can manage own notes" ON public.class_notes FOR ALL TO authenticated
  USING (is_faculty(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM faculty f WHERE f.id = class_notes.faculty_id AND f.user_id = auth.uid()));
CREATE POLICY "Students can view section notes" ON public.class_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.user_id = auth.uid() AND s.section = class_notes.section));
CREATE POLICY "Admins can manage all notes" ON public.class_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));

-- Parent Communications
CREATE TABLE public.parent_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  communication_type text NOT NULL DEFAULT 'call',
  date date NOT NULL,
  summary text NOT NULL,
  parent_name text,
  parent_phone text,
  follow_up_needed boolean DEFAULT false,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors can manage communications" ON public.parent_communications FOR ALL TO authenticated
  USING (is_tutor(auth.uid())) WITH CHECK (is_tutor(auth.uid()));
CREATE POLICY "Admins can view all communications" ON public.parent_communications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));

-- Mentoring Sessions
CREATE TABLE public.mentoring_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  session_type text NOT NULL DEFAULT 'general',
  notes text NOT NULL,
  action_items text,
  next_session_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mentoring_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors can manage sessions" ON public.mentoring_sessions FOR ALL TO authenticated
  USING (is_tutor(auth.uid())) WITH CHECK (is_tutor(auth.uid()));
CREATE POLICY "Admins can view all sessions" ON public.mentoring_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));

-- Student Achievements
CREATE TABLE public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'academic',
  description text,
  date date NOT NULL,
  certificate_url text,
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES public.faculty(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own achievements" ON public.student_achievements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_achievements.student_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.id = student_achievements.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Faculty can view achievements" ON public.student_achievements FOR SELECT TO authenticated
  USING (is_faculty(auth.uid()));
CREATE POLICY "Admins can manage all achievements" ON public.student_achievements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));

-- Faculty Feedback (anonymous from students)
CREATE TABLE public.faculty_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  subject text NOT NULL,
  section public.section_type NOT NULL,
  rating integer NOT NULL,
  teaching_quality integer,
  communication integer,
  punctuality integer,
  comments text,
  semester integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faculty_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can submit feedback" ON public.faculty_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view feedback" ON public.faculty_feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Faculty can view own feedback" ON public.faculty_feedback FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM faculty f WHERE f.id = faculty_feedback.faculty_id AND f.user_id = auth.uid()));

-- Exam Timetable
CREATE TABLE public.exam_timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name text NOT NULL,
  subject text NOT NULL,
  section public.section_type NOT NULL,
  exam_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue text,
  year public.year_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.faculty(id)
);
ALTER TABLE public.exam_timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view exam timetable" ON public.exam_timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage exam timetable" ON public.exam_timetable FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));
