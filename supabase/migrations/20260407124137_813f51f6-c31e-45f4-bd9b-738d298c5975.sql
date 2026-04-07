
-- Remove duplicate role rows, keeping only the correct one per user
-- First delete all rows for users with duplicates
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.user_roles GROUP BY user_id HAVING COUNT(*) > 1
);

-- Drop the old composite unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add a unique constraint on just user_id (one role per user)
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
