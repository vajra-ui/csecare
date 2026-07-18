
GRANT SELECT (id, user_id, faculty_id, name, qualification, years_of_experience, current_subjects, section, sections, is_tutor, created_at, updated_at, bio, linkedin_url, specialization, research_interests, profile_photo_url)
  ON public.faculty TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faculty TO authenticated;
GRANT ALL ON public.faculty TO service_role;
