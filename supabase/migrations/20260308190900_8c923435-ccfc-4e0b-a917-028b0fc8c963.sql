
-- Tighten notification insert - ensure user_id is set to a valid auth user (not self-notifying arbitrarily)
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = notifications.user_id)
  );
