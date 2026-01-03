-- Create sleep_sessions table for tracking sleep
CREATE TABLE public.sleep_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
  sleep_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  quality_score INTEGER, -- 1-10 self-reported in morning
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own sleep sessions" 
ON public.sleep_sessions 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own sleep sessions" 
ON public.sleep_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own sleep sessions" 
ON public.sleep_sessions 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own sleep sessions" 
ON public.sleep_sessions 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create index for efficient querying
CREATE INDEX idx_sleep_sessions_owner_date ON public.sleep_sessions(owner_id, sleep_start DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sleep_sessions_updated_at
BEFORE UPDATE ON public.sleep_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();