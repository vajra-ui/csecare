
-- Restore data-API access to faculty (previous PII fix revoked everything)
GRANT INSERT, UPDATE, DELETE ON public.faculty TO authenticated;
GRANT ALL ON public.faculty TO service_role;

-- Column-level SELECT: everything EXCEPT PII columns
GRANT SELECT (
  id, user_id, faculty_id, name, qualification, years_of_experience,
  current_subjects, section, sections, is_tutor, bio, linkedin_url,
  specialization, research_interests, profile_photo_url,
  created_at, updated_at
) ON public.faculty TO authenticated;

-- Fix notifications: only admins/faculty/tutors (or the user themselves) can insert
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Staff or self can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'ADMIN')
  OR public.is_faculty(auth.uid())
  OR public.is_tutor(auth.uid())
);
