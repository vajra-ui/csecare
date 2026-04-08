
-- Allow faculty to insert their own timetable entries
CREATE POLICY "Faculty can insert own timetable"
ON public.timetable
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.faculty f
    WHERE f.id = timetable.faculty_id AND f.user_id = auth.uid()
  )
);

-- Allow faculty to delete their own timetable entries
CREATE POLICY "Faculty can delete own timetable"
ON public.timetable
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.faculty f
    WHERE f.id = timetable.faculty_id AND f.user_id = auth.uid()
  )
);

-- Allow faculty to insert subject_scores
CREATE POLICY "Faculty can insert subject scores"
ON public.subject_scores
FOR INSERT
TO authenticated
WITH CHECK (is_faculty(auth.uid()));

-- Allow faculty to update subject_scores
CREATE POLICY "Faculty can update subject scores"
ON public.subject_scores
FOR UPDATE
TO authenticated
USING (is_faculty(auth.uid()))
WITH CHECK (is_faculty(auth.uid()));

-- Allow faculty to view subject_scores
CREATE POLICY "Faculty can view subject scores"
ON public.subject_scores
FOR SELECT
TO authenticated
USING (is_faculty(auth.uid()));

-- Allow admin full CRUD on subject_scores
CREATE POLICY "Admins can manage subject scores"
ON public.subject_scores
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::text))
WITH CHECK (has_role(auth.uid(), 'ADMIN'::text));

-- Allow faculty to insert academic_records
CREATE POLICY "Faculty can insert academic records"
ON public.academic_records
FOR INSERT
TO authenticated
WITH CHECK (is_faculty(auth.uid()));

-- Allow faculty to update academic_records
CREATE POLICY "Faculty can update academic records"
ON public.academic_records
FOR UPDATE
TO authenticated
USING (is_faculty(auth.uid()))
WITH CHECK (is_faculty(auth.uid()));

-- Allow faculty to view academic_records
CREATE POLICY "Faculty can view academic records"
ON public.academic_records
FOR SELECT
TO authenticated
USING (is_faculty(auth.uid()));
