-- Create refund_requests table to track refund requests with status
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  payment_id TEXT,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reason_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'refunded')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  mollie_refund_id TEXT,
  cooldown_bypass BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own refund requests
CREATE POLICY "Users can view their own refund requests"
ON public.refund_requests
FOR SELECT
USING (auth.uid() = owner_id);

-- Users can create refund requests for themselves
CREATE POLICY "Users can create their own refund requests"
ON public.refund_requests
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Admins can view all refund requests
CREATE POLICY "Admins can view all refund requests"
ON public.refund_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Admins can update any refund request
CREATE POLICY "Admins can update refund requests"
ON public.refund_requests
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create index for faster lookups
CREATE INDEX idx_refund_requests_owner ON public.refund_requests(owner_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);

-- Add updated_at trigger
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();