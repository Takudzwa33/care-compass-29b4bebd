
-- Tighten the insert policy to only allow inserting own audit entries
DROP POLICY "Authenticated inserts audit logs" ON public.login_audit_logs;
CREATE POLICY "Users insert own audit logs"
  ON public.login_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
