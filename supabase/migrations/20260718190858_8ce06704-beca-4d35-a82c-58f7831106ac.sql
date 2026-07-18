
CREATE TABLE public.placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT,
  package_lpa NUMERIC(6,2),
  offer_type TEXT NOT NULL DEFAULT 'FULL_TIME',
  offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'OFFERED',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placements TO authenticated;
GRANT ALL ON public.placements TO service_role;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage placements" ON public.placements FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Students view own placements" ON public.placements FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = placements.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Faculty view placements" ON public.placements FOR SELECT
  USING (public.is_faculty(auth.uid()));

CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON public.placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_placements_student ON public.placements(student_id);
CREATE INDEX idx_placements_date ON public.placements(offer_date DESC);
