
-- Faculty Achievements table
CREATE TABLE public.faculty_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'research',
  description TEXT,
  date DATE NOT NULL,
  certificate_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can manage own achievements" ON public.faculty_achievements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.faculty f WHERE f.id = faculty_achievements.faculty_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.faculty f WHERE f.id = faculty_achievements.faculty_id AND f.user_id = auth.uid()));

CREATE POLICY "Admins can manage all faculty achievements" ON public.faculty_achievements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Faculty OD Requests table
CREATE TABLE public.faculty_od_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty_od_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can manage own OD requests" ON public.faculty_od_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.faculty f WHERE f.id = faculty_od_requests.faculty_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.faculty f WHERE f.id = faculty_od_requests.faculty_id AND f.user_id = auth.uid()));

CREATE POLICY "Admins can manage all faculty OD requests" ON public.faculty_od_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Add student status column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_year INTEGER;
