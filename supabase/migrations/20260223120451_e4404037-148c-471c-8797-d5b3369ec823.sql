
-- =============================================
-- 1. EMR columns for patients
-- =============================================
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS insurance_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS medical_record_number text,
  ADD COLUMN IF NOT EXISTS import_source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- =============================================
-- 2. EMR columns for nurses
-- =============================================
ALTER TABLE public.nurses
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS years_of_experience integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS import_source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- =============================================
-- 3. Data audit log table for tracking modifications
-- =============================================
CREATE TABLE public.data_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads data audit"
  ON public.data_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts data audit"
  ON public.data_audit_log FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_data_audit_table_record ON public.data_audit_log(table_name, record_id);
CREATE INDEX idx_data_audit_created ON public.data_audit_log(created_at DESC);

-- =============================================
-- 4. Trigger function to auto-log changes
-- =============================================
CREATE OR REPLACE FUNCTION public.log_data_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _changed text[] := '{}';
  _key text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    FOR _key IN SELECT jsonb_object_keys(to_jsonb(NEW))
    LOOP
      IF to_jsonb(NEW)->>_key IS DISTINCT FROM to_jsonb(OLD)->>_key THEN
        _changed := array_append(_changed, _key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.data_audit_log (table_name, record_id, operation, changed_by, old_data, new_data, changed_fields)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (OLD).id ELSE (NEW).id END,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN _changed ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- =============================================
-- 5. Attach audit triggers to patients and nurses
-- =============================================
CREATE TRIGGER audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.log_data_change();

CREATE TRIGGER audit_nurses
  AFTER INSERT OR UPDATE OR DELETE ON public.nurses
  FOR EACH ROW EXECUTE FUNCTION public.log_data_change();

-- =============================================
-- 6. EMR import batches tracking table
-- =============================================
CREATE TABLE public.emr_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  target_table text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validating','importing','completed','failed')),
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.emr_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages imports"
  ON public.emr_import_batches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.data_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emr_import_batches;
