
-- Storage buckets for student files
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false);

-- RLS for student-photos bucket
CREATE POLICY "Students can upload their own photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can update their own photo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view student photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "Students can delete their own photo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS for student-documents bucket
CREATE POLICY "Students can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-documents' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'ADMIN')
    OR public.is_tutor(auth.uid())
  )
);

CREATE POLICY "Students can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add profile_photo_url to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Create student_documents table for tracking uploads
CREATE TABLE public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('assignment', 'certificate', 'kyc')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  description text,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own documents"
ON public.student_documents FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tutors can view student documents"
ON public.student_documents FOR SELECT TO authenticated
USING (public.is_tutor(auth.uid()));

CREATE POLICY "Admins can manage all documents"
ON public.student_documents FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));
