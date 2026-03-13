-- Alumni table
CREATE TABLE public.alumni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  graduation_year integer NOT NULL,
  company text,
  role text,
  location text,
  linkedin text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage alumni" ON public.alumni FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- Authenticated can view alumni
CREATE POLICY "Authenticated can view alumni" ON public.alumni FOR SELECT TO authenticated
  USING (true);

-- Showcase achievements table (admin-posted front page)
CREATE TABLE public.showcase_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  category text NOT NULL DEFAULT 'general',
  student_name text,
  achievement_date date NOT NULL DEFAULT CURRENT_DATE,
  posted_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_achievements ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD
CREATE POLICY "Admins can manage showcase" ON public.showcase_achievements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ADMIN')) WITH CHECK (has_role(auth.uid(), 'ADMIN'));

-- Public can view active achievements (for front page)
CREATE POLICY "Anyone can view active showcase" ON public.showcase_achievements FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Storage bucket for showcase images
INSERT INTO storage.buckets (id, name, public) VALUES ('showcase-images', 'showcase-images', true);

-- Storage policy for showcase images
CREATE POLICY "Admins can upload showcase images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'showcase-images' AND has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Anyone can view showcase images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'showcase-images');

CREATE POLICY "Admins can delete showcase images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'showcase-images' AND has_role(auth.uid(), 'ADMIN'));