
CREATE TABLE public.anonymous_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  section public.section_type NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  tutor_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anonymous_complaints TO authenticated;
GRANT ALL ON public.anonymous_complaints TO service_role;

ALTER TABLE public.anonymous_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can create own complaint" ON public.anonymous_complaints
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid()));

CREATE POLICY "Student can view own complaints" ON public.anonymous_complaints
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid()));

CREATE POLICY "Tutor can view section complaints" ON public.anonymous_complaints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faculty f
      WHERE f.user_id = auth.uid()
        AND f.is_tutor = true
        AND (f.section = anonymous_complaints.section OR anonymous_complaints.section::text = ANY(COALESCE(f.sections, ARRAY[]::text[])))
    )
  );

CREATE POLICY "Tutor can respond to complaints" ON public.anonymous_complaints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faculty f
      WHERE f.user_id = auth.uid()
        AND f.is_tutor = true
        AND (f.section = anonymous_complaints.section OR anonymous_complaints.section::text = ANY(COALESCE(f.sections, ARRAY[]::text[])))
    )
  );

CREATE POLICY "Admin manages complaints" ON public.anonymous_complaints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE TRIGGER update_anonymous_complaints_updated_at
  BEFORE UPDATE ON public.anonymous_complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.study_buddy_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section public.section_type NOT NULL,
  student_a UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_b UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  complementary_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reasoning TEXT,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_buddy_pairs TO authenticated;
GRANT ALL ON public.study_buddy_pairs TO service_role;

ALTER TABLE public.study_buddy_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own pairings" ON public.study_buddy_pairs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = auth.uid() AND (s.id = student_a OR s.id = student_b)));

CREATE POLICY "Faculty view section pairs" ON public.study_buddy_pairs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faculty f
      WHERE f.user_id = auth.uid()
        AND (f.section = study_buddy_pairs.section OR study_buddy_pairs.section::text = ANY(COALESCE(f.sections, ARRAY[]::text[])))
    )
  );

CREATE POLICY "Faculty create section pairs" ON public.study_buddy_pairs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty f
      WHERE f.user_id = auth.uid()
        AND (f.section = study_buddy_pairs.section OR study_buddy_pairs.section::text = ANY(COALESCE(f.sections, ARRAY[]::text[])))
    )
  );

CREATE POLICY "Faculty delete section pairs" ON public.study_buddy_pairs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faculty f
      WHERE f.user_id = auth.uid()
        AND (f.section = study_buddy_pairs.section OR study_buddy_pairs.section::text = ANY(COALESCE(f.sections, ARRAY[]::text[])))
    )
  );

CREATE POLICY "Admin manages pairs" ON public.study_buddy_pairs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
