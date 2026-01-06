-- Create table for admin-granted premium access
CREATE TABLE public.premium_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_by UUID NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

-- Admins can manage all grants
CREATE POLICY "Admins can manage premium grants"
ON public.premium_grants
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own grant (by user_id or email)
CREATE POLICY "Users can view own premium grant"
ON public.premium_grants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_premium_grants_updated_at
  BEFORE UPDATE ON public.premium_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to link premium grant when user signs up with matching email
CREATE OR REPLACE FUNCTION public.link_premium_grant_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link premium grant if email matches
  UPDATE public.premium_grants
  SET user_id = NEW.id, updated_at = now()
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger to run on new user signup
CREATE TRIGGER on_auth_user_created_link_premium
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_premium_grant_on_signup();