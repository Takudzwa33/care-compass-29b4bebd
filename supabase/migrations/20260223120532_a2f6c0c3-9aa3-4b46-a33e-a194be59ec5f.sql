
-- Fix: restrict data_audit_log insert to authenticated users only (trigger uses SECURITY DEFINER anyway)
DROP POLICY "System inserts data audit" ON public.data_audit_log;
CREATE POLICY "Authenticated inserts data audit"
  ON public.data_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
