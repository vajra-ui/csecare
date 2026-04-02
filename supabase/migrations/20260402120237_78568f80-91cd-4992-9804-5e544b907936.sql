
-- Storage RLS policies for student-documents bucket (achievement certificate uploads)
CREATE POLICY "Students can upload to student-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = 'achievements'
  AND EXISTS (
    SELECT 1 FROM public.students s WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Students can view own documents in student-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (
    EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'ADMIN')
    OR public.is_faculty(auth.uid())
  )
);
