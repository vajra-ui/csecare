-- Revoke blanket column access; grant only non-PII columns to authenticated
REVOKE SELECT ON public.faculty FROM authenticated;
GRANT SELECT (id, user_id, faculty_id, name, qualification, years_of_experience, current_subjects, section, sections, is_tutor, bio, linkedin_url, specialization, research_interests, profile_photo_url, created_at, updated_at) ON public.faculty TO authenticated;
GRANT SELECT ON public.faculty TO service_role;

-- Helper: read PII rows only for admins, tutors, or the faculty owner themselves
CREATE OR REPLACE FUNCTION public.get_faculty_pii(_faculty_id uuid)
RETURNS TABLE(personal_email text, phone text, address text, dob date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.personal_email, f.phone, f.address, f.dob
  FROM public.faculty f
  WHERE f.id = _faculty_id
    AND (
      f.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'ADMIN')
      OR public.is_tutor(auth.uid())
    );
$$;
REVOKE ALL ON FUNCTION public.get_faculty_pii(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_faculty_pii(uuid) TO authenticated;