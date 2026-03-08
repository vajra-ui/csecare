
-- Make feedback insert more restrictive - only authenticated students
DROP POLICY "Students can submit feedback" ON public.faculty_feedback;
CREATE POLICY "Authenticated users can submit feedback" ON public.faculty_feedback 
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.user_id = auth.uid()));
