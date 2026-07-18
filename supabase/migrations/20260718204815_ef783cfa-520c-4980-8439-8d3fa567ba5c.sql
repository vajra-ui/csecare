-- Faculty: keep direct table reads limited to non-sensitive columns, and expose full rows through an admin-only function.
REVOKE SELECT ON public.faculty FROM authenticated;
REVOKE SELECT (dob, personal_email, phone, address) ON public.faculty FROM authenticated;

GRANT SELECT (
  id,
  user_id,
  faculty_id,
  name,
  qualification,
  years_of_experience,
  current_subjects,
  section,
  is_tutor,
  created_at,
  updated_at,
  sections,
  bio,
  linkedin_url,
  specialization,
  research_interests,
  profile_photo_url
) ON public.faculty TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faculty TO authenticated;
GRANT ALL ON public.faculty TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_faculty_records()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  faculty_id text,
  name text,
  dob date,
  qualification text,
  years_of_experience integer,
  current_subjects text[],
  section section_type,
  is_tutor boolean,
  created_at timestamptz,
  updated_at timestamptz,
  sections text[],
  phone text,
  personal_email text,
  address text,
  bio text,
  linkedin_url text,
  specialization text,
  research_interests text[],
  profile_photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.user_id,
    f.faculty_id,
    f.name,
    f.dob,
    f.qualification,
    f.years_of_experience,
    f.current_subjects,
    f.section,
    f.is_tutor,
    f.created_at,
    f.updated_at,
    f.sections,
    f.phone,
    f.personal_email,
    f.address,
    f.bio,
    f.linkedin_url,
    f.specialization,
    f.research_interests,
    f.profile_photo_url
  FROM public.faculty f
  WHERE public.has_role(auth.uid(), 'ADMIN')
  ORDER BY f.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_faculty_records() TO authenticated;

-- Alumni: students can view mentor directory fields only; full contact details are admin-only.
REVOKE SELECT ON public.alumni FROM authenticated;
REVOKE SELECT (email, phone) ON public.alumni FROM authenticated;

GRANT SELECT (
  id,
  name,
  graduation_year,
  company,
  role,
  location,
  linkedin,
  created_at,
  department,
  profile_image_url
) ON public.alumni TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.alumni TO authenticated;
GRANT ALL ON public.alumni TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_alumni_records()
RETURNS TABLE (
  id uuid,
  name text,
  graduation_year integer,
  company text,
  role text,
  location text,
  linkedin text,
  email text,
  created_at timestamptz,
  department text,
  phone text,
  profile_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.name,
    a.graduation_year,
    a.company,
    a.role,
    a.location,
    a.linkedin,
    a.email,
    a.created_at,
    a.department,
    a.phone,
    a.profile_image_url
  FROM public.alumni a
  WHERE public.has_role(auth.uid(), 'ADMIN')
  ORDER BY a.graduation_year DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_alumni_records() TO authenticated;