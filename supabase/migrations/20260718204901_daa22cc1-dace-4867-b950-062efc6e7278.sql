REVOKE SELECT (email, phone, linkedin, location) ON public.alumni FROM authenticated;

GRANT SELECT (
  id,
  name,
  graduation_year,
  company,
  role,
  created_at,
  department,
  profile_image_url
) ON public.alumni TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.alumni TO authenticated;
GRANT ALL ON public.alumni TO service_role;