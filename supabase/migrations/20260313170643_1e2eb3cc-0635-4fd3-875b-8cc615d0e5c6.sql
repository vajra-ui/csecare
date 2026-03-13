-- Allow faculty to UPDATE assignment_submissions (for grading/feedback)
CREATE POLICY "Faculty can update submissions"
ON public.assignment_submissions
FOR UPDATE
TO authenticated
USING (is_faculty(auth.uid()))
WITH CHECK (is_faculty(auth.uid()));