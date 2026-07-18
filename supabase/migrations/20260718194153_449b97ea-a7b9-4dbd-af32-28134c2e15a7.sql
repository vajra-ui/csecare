
CREATE POLICY "Faculty can upload own photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'faculty-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Faculty can update own photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'faculty-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Faculty can delete own photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'faculty-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated can view faculty photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'faculty-photos');
