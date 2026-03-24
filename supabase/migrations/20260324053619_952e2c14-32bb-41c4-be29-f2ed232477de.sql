
-- 1. Atomic attendance save RPC
CREATE OR REPLACE FUNCTION public.save_attendance_atomic(
  _faculty_id uuid,
  _date date,
  _hour_number integer,
  _subject text,
  _section text,
  _records jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _record jsonb;
  _student_ids uuid[];
  _inserted integer := 0;
BEGIN
  -- Extract student IDs from records
  SELECT array_agg((r->>'student_id')::uuid)
  INTO _student_ids
  FROM jsonb_array_elements(_records) AS r;

  -- Delete existing attendance for this date/hour/section students
  DELETE FROM public.attendance
  WHERE date = _date
    AND hour_number = _hour_number
    AND student_id = ANY(_student_ids);

  -- Insert new records
  INSERT INTO public.attendance (student_id, faculty_id, date, hour_number, subject, is_present)
  SELECT
    (r->>'student_id')::uuid,
    _faculty_id,
    _date,
    _hour_number,
    _subject,
    COALESCE((r->>'is_present')::boolean, false)
  FROM jsonb_array_elements(_records) AS r;

  GET DIAGNOSTICS _inserted = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'inserted', _inserted);
END;
$$;

-- 2. Database indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_hour ON public.attendance(date, hour_number);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_faculty_id ON public.assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_assignments_section ON public.assignments(section);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON public.faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_od_requests_student_id ON public.od_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_od_requests_status ON public.od_requests(status);
