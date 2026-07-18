
-- Performance indexes for 200+ users
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date_section ON public.attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_faculty_date ON public.attendance(faculty_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_subject_scores_student ON public.subject_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_academic_records_student ON public.academic_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activities_student_status ON public.student_activities(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_activities_status_created ON public.student_activities(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_od_requests_student_status ON public.od_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_od_requests_tutor ON public.od_requests(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_section_year ON public.students(section, year);
CREATE INDEX IF NOT EXISTS idx_students_tutor ON public.students(tutor_id);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timetable_section_day ON public.timetable(section, day_of_week);
CREATE INDEX IF NOT EXISTS idx_faculty_user ON public.faculty(user_id);
