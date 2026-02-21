
-- Update the handle_new_user trigger to read role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  -- Read role from signup metadata, default to 'nurse'
  BEGIN
    _role := (NEW.raw_user_meta_data->>'role')::app_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'nurse';
  END;
  
  IF _role IS NULL THEN
    _role := 'nurse';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$$;
