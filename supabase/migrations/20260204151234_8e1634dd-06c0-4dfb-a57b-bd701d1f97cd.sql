-- Fix function search_path warnings by recreating functions with explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop the overly permissive audit log insert policy and create a more secure one
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy for audit logs - only authenticated users can insert
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);