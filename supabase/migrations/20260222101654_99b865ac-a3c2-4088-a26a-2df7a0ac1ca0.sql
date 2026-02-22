
-- Login audit log table
CREATE TABLE public.login_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  event_type text NOT NULL DEFAULT 'login_success',
  ip_address text,
  user_agent text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads audit logs"
  ON public.login_audit_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated inserts audit logs"
  ON public.login_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon insert for failed login attempts (user not authenticated yet)
CREATE POLICY "Anon inserts failed login"
  ON public.login_audit_logs FOR INSERT
  TO anon
  WITH CHECK (event_type = 'login_failed');

-- Enable realtime for audit logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_audit_logs;

-- System settings table for escalation threshold
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manages settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default escalation threshold (5 minutes)
INSERT INTO public.system_settings (key, value) VALUES ('code_blue_escalation_minutes', '5');
