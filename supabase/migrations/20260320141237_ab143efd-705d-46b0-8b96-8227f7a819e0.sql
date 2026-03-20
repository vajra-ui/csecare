
-- Results table for COE
CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester integer NOT NULL,
  subject_code text NOT NULL,
  subject_name text NOT NULL,
  marks numeric,
  grade text,
  published_by uuid,
  published_at timestamp with time zone,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- COE (admin role) can manage all results
CREATE POLICY "Admins can manage results" ON public.results FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- Students can view their own published results
CREATE POLICY "Students can view own published results" ON public.results FOR SELECT TO authenticated
  USING (is_published = true AND EXISTS (SELECT 1 FROM students s WHERE s.id = results.student_id AND s.user_id = auth.uid()));

-- Faculty can view published results
CREATE POLICY "Faculty can view published results" ON public.results FOR SELECT TO authenticated
  USING (is_published = true AND is_faculty(auth.uid()));

-- Add department column to alumni for filtering
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS department text DEFAULT 'CSE';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS profile_image_url text;
