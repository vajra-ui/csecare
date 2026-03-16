
-- Allow tutors to INSERT timetable entries
CREATE POLICY "Tutors can manage timetables"
ON public.timetable
FOR ALL
TO authenticated
USING (is_tutor(auth.uid()))
WITH CHECK (is_tutor(auth.uid()));

-- Allow students to view timetable for their section
CREATE POLICY "Students can view section timetable"
ON public.timetable
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = auth.uid()
    AND s.section = timetable.section
  )
);
