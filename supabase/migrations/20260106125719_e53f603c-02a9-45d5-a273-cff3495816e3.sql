-- Create affiliate products table
CREATE TABLE public.affiliate_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  affiliate_url TEXT NOT NULL,
  price_indication TEXT,
  category TEXT NOT NULL DEFAULT 'algemeen',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view published products
CREATE POLICY "Anyone can view published products"
ON public.affiliate_products
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all products"
ON public.affiliate_products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create updated_at trigger
CREATE TRIGGER update_affiliate_products_updated_at
  BEFORE UPDATE ON public.affiliate_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();