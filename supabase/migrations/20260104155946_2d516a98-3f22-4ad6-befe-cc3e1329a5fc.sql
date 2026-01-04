-- Create table for caching AI insights (1 per day per type)
CREATE TABLE public.ai_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'daily', 'weekly', 'sleep', 'cycle', 'combined'
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  insight_data JSONB NOT NULL,
  input_hash TEXT, -- hash of input data to detect changes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, insight_type, insight_date)
);

-- Enable RLS
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cached insights
CREATE POLICY "Users can view own cached insights"
  ON public.ai_insights_cache FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own cached insights"
  ON public.ai_insights_cache FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own cached insights"
  ON public.ai_insights_cache FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own cached insights"
  ON public.ai_insights_cache FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_insights_cache_updated_at
  BEFORE UPDATE ON public.ai_insights_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_ai_insights_cache_lookup 
  ON public.ai_insights_cache(owner_id, insight_type, insight_date);

-- Cleanup old cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_ai_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_insights_cache 
  WHERE insight_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;