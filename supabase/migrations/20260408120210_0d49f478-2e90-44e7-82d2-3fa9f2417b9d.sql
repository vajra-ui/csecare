
ALTER TABLE public.faculty ADD COLUMN sections text[] DEFAULT '{}';

-- Migrate existing section data into sections array
UPDATE public.faculty SET sections = ARRAY[section::text] WHERE section IS NOT NULL;
