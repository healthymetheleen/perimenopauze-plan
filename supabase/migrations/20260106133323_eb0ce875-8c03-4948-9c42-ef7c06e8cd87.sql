-- Create table for storing perimenopause test results
CREATE TABLE public.perimenopause_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  
  -- Consent tracking
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMP WITH TIME ZONE,
  
  -- Domain scores
  domain_cycle_score SMALLINT NOT NULL DEFAULT 0,
  domain_energy_score SMALLINT NOT NULL DEFAULT 0,
  domain_mental_score SMALLINT NOT NULL DEFAULT 0,
  domain_body_score SMALLINT NOT NULL DEFAULT 0,
  
  -- Total and category
  total_score SMALLINT NOT NULL DEFAULT 0,
  result_category TEXT NOT NULL, -- 'low', 'moderate', 'high'
  
  -- Individual answers stored as JSONB for flexibility
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Data retention
  retention_until DATE
);

-- Enable RLS
ALTER TABLE public.perimenopause_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own test results"
  ON public.perimenopause_tests
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own test results"
  ON public.perimenopause_tests
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own test results"
  ON public.perimenopause_tests
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own test results"
  ON public.perimenopause_tests
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Add index for faster lookups
CREATE INDEX idx_perimenopause_tests_owner_id ON public.perimenopause_tests(owner_id);
CREATE INDEX idx_perimenopause_tests_created_at ON public.perimenopause_tests(created_at DESC);