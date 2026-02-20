
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'nurse', 'doctor', 'emergency');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Wards
CREATE TABLE public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  safe_ratio_threshold NUMERIC NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id),
  severity TEXT NOT NULL DEFAULT 'Stable' CHECK (severity IN ('Critical','Serious','Moderate','Stable')),
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  assigned_nurse_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Nurses (staff records linked to profiles)
CREATE TABLE public.nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nurse_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id),
  shift TEXT NOT NULL DEFAULT 'Day' CHECK (shift IN ('Day','Night','Swing')),
  status TEXT NOT NULL DEFAULT 'On-Duty' CHECK (status IN ('On-Duty','Off-Duty','On-Leave')),
  role_title TEXT NOT NULL DEFAULT 'Nurse',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;

-- Add FK from patients to nurses
ALTER TABLE public.patients ADD CONSTRAINT fk_patients_nurse FOREIGN KEY (assigned_nurse_id) REFERENCES public.nurses(id);

-- Code Blue Events
CREATE TABLE public.code_blue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  ward_id UUID REFERENCES public.wards(id),
  trigger_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time TIMESTAMPTZ,
  team_members TEXT[] DEFAULT '{}',
  outcome TEXT DEFAULT 'Pending',
  response_minutes NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.code_blue_events ENABLE ROW LEVEL SECURITY;

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL DEFAULT 'info' CHECK (alert_type IN ('critical','warning','info')),
  message TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Patient Feedback
CREATE TABLE public.patient_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  patient_name TEXT NOT NULL,
  ward_id UUID REFERENCES public.wards(id),
  satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  nurse_responsiveness INTEGER NOT NULL CHECK (nurse_responsiveness BETWEEN 1 AND 5),
  overall_experience INTEGER NOT NULL CHECK (overall_experience BETWEEN 1 AND 5),
  comments TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  -- Default role is nurse
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'nurse');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_nurses_updated_at BEFORE UPDATE ON public.nurses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ======= RLS POLICIES =======

-- Profiles: everyone authenticated can read, own user can update
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: everyone can read (needed for UI), only admin can modify
CREATE POLICY "Anyone can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Wards: everyone reads, admin modifies
CREATE POLICY "Anyone reads wards" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages wards" ON public.wards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Patients: all authenticated can read, admin/nurse/doctor can insert/update
CREATE POLICY "Auth users read patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor')
);
CREATE POLICY "Staff update patients" ON public.patients FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor')
);
CREATE POLICY "Admin deletes patients" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Nurses: all read, admin manages
CREATE POLICY "Auth users read nurses" ON public.nurses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages nurses" ON public.nurses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates nurses" ON public.nurses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin deletes nurses" ON public.nurses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Code Blue: all read, staff can insert/update
CREATE POLICY "Auth reads code blue" ON public.code_blue_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff creates code blue" ON public.code_blue_events FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'emergency')
);
CREATE POLICY "Staff updates code blue" ON public.code_blue_events FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'emergency')
);

-- Alerts: all read, staff creates, admin/emergency updates
CREATE POLICY "Auth reads alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff creates alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor')
);
CREATE POLICY "Staff updates alerts" ON public.alerts FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'emergency')
);

-- Patient Feedback: all read, staff creates, admin manages
CREATE POLICY "Auth reads feedback" ON public.patient_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff creates feedback" ON public.patient_feedback FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor')
);
CREATE POLICY "Admin manages feedback" ON public.patient_feedback FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nurses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_blue_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
