-- Create AI usage tracking table for rate limiting
CREATE TABLE public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  function_name TEXT NOT NULL, -- 'analyze-meal', 'cycle-coach', 'voice-to-text'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage" 
ON public.ai_usage 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own AI usage" 
ON public.ai_usage 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Create index for efficient querying
CREATE INDEX idx_ai_usage_owner_month ON public.ai_usage(owner_id, created_at);

-- Create a function to check if user has exceeded their monthly limit
CREATE OR REPLACE FUNCTION public.check_ai_limit(user_id UUID, monthly_limit INTEGER DEFAULT 30)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count INTEGER;
  month_start TIMESTAMP WITH TIME ZONE;
BEGIN
  month_start := date_trunc('month', now());
  
  SELECT COUNT(*) INTO usage_count
  FROM public.ai_usage
  WHERE owner_id = user_id
    AND created_at >= month_start;
  
  RETURN usage_count < monthly_limit;
END;
$$;

-- Create a function to get remaining AI calls
CREATE OR REPLACE FUNCTION public.get_ai_usage_remaining(user_id UUID, monthly_limit INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count INTEGER;
  month_start TIMESTAMP WITH TIME ZONE;
BEGIN
  month_start := date_trunc('month', now());
  
  SELECT COUNT(*) INTO usage_count
  FROM public.ai_usage
  WHERE owner_id = user_id
    AND created_at >= month_start;
  
  RETURN GREATEST(0, monthly_limit - usage_count);
END;
$$;