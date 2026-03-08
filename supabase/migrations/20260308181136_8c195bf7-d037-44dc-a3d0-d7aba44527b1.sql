-- Allow faculty to update their own editable fields
CREATE POLICY "Faculty can update own profile"
ON public.faculty
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());