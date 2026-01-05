-- Add Mollie-specific fields to subscriptions table for proper recurring payment management
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT,
ADD COLUMN IF NOT EXISTS mollie_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_ends_at TIMESTAMP WITH TIME ZONE;

-- Add index for Mollie lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_customer ON public.subscriptions(mollie_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_subscription ON public.subscriptions(mollie_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN public.subscriptions.mollie_customer_id IS 'Mollie customer ID for recurring payments';
COMMENT ON COLUMN public.subscriptions.mollie_subscription_id IS 'Mollie subscription ID for periodic charges';
COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 'When the 7-day free trial ends';
COMMENT ON COLUMN public.subscriptions.current_period_ends_at IS 'When the current billing period ends';