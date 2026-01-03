-- Cyclus tracking tabellen

-- Cycle preferences per user
CREATE TABLE IF NOT EXISTS public.cycle_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hormonal_contraception BOOLEAN DEFAULT false,
  has_iud BOOLEAN DEFAULT false,
  breastfeeding BOOLEAN DEFAULT false,
  recently_pregnant BOOLEAN DEFAULT false,
  perimenopause BOOLEAN DEFAULT false,
  pcos BOOLEAN DEFAULT false,
  avg_cycle_length INTEGER,
  cycle_variability INTEGER,
  avg_period_length INTEGER,
  luteal_phase_length INTEGER DEFAULT 13 CHECK (luteal_phase_length >= 11 AND luteal_phase_length <= 15),
  show_fertile_days BOOLEAN DEFAULT false,
  reminders_enabled BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- Cycles (menstruatieperiodes)
CREATE TABLE IF NOT EXISTS public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  computed_cycle_length INTEGER,
  is_anovulatory BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycles_owner_start ON public.cycles(owner_id, start_date DESC);

-- Bleeding logs (dagelijkse menstruatie logging)
CREATE TABLE IF NOT EXISTS public.bleeding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  intensity TEXT NOT NULL CHECK (intensity IN ('spotting', 'licht', 'normaal', 'hevig')),
  pain_score SMALLINT CHECK (pain_score IS NULL OR (pain_score >= 0 AND pain_score <= 10)),
  is_intermenstrual BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, log_date)
);

-- Symptom logs (dagelijkse symptomen)
CREATE TABLE IF NOT EXISTS public.cycle_symptom_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  energy SMALLINT CHECK (energy IS NULL OR (energy >= 1 AND energy <= 10)),
  mood SMALLINT CHECK (mood IS NULL OR (mood >= 1 AND mood <= 10)),
  sleep_quality SMALLINT CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 10)),
  libido SMALLINT CHECK (libido IS NULL OR (libido >= 1 AND libido <= 10)),
  cravings TEXT CHECK (cravings IS NULL OR cravings IN ('none', 'mild', 'strong')),
  headache BOOLEAN DEFAULT false,
  breast_tender BOOLEAN DEFAULT false,
  anxiety BOOLEAN DEFAULT false,
  hot_flashes BOOLEAN DEFAULT false,
  bloating BOOLEAN DEFAULT false,
  irritability BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, log_date)
);

-- Fertility signals (optionele tracking)
CREATE TABLE IF NOT EXISTS public.fertility_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  bbt NUMERIC(4,2),
  cervical_mucus TEXT CHECK (cervical_mucus IS NULL OR cervical_mucus IN ('dry', 'sticky', 'creamy', 'watery', 'eggwhite')),
  lh_test TEXT CHECK (lh_test IS NULL OR lh_test IN ('negative', 'positive')),
  resting_hr INTEGER,
  training_load SMALLINT CHECK (training_load IS NULL OR (training_load >= 1 AND training_load <= 10)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, log_date)
);

-- Cycle predictions (gegenereerde voorspellingen)
CREATE TABLE IF NOT EXISTS public.cycle_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_phase TEXT NOT NULL CHECK (current_phase IN ('menstruatie', 'folliculair', 'ovulatie', 'luteaal', 'onbekend')),
  current_season TEXT NOT NULL CHECK (current_season IN ('winter', 'lente', 'zomer', 'herfst', 'onbekend')),
  next_period_start_min DATE,
  next_period_start_max DATE,
  next_period_confidence SMALLINT CHECK (next_period_confidence IS NULL OR (next_period_confidence >= 0 AND next_period_confidence <= 100)),
  ovulation_min DATE,
  ovulation_max DATE,
  ovulation_confidence SMALLINT CHECK (ovulation_confidence IS NULL OR (ovulation_confidence >= 0 AND ovulation_confidence <= 100)),
  fertile_window_start DATE,
  fertile_window_end DATE,
  fertile_confidence SMALLINT CHECK (fertile_confidence IS NULL OR (fertile_confidence >= 0 AND fertile_confidence <= 100)),
  avg_cycle_length INTEGER,
  cycle_variability INTEGER,
  rationale TEXT,
  ai_tips JSONB DEFAULT '{}',
  watchouts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_owner ON public.cycle_predictions(owner_id, generated_at DESC);

-- Enable RLS
ALTER TABLE public.cycle_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bleeding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertility_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies - cycle_preferences
CREATE POLICY "Users can view own cycle preferences" ON public.cycle_preferences FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own cycle preferences" ON public.cycle_preferences FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own cycle preferences" ON public.cycle_preferences FOR UPDATE USING (auth.uid() = owner_id);

-- RLS policies - cycles
CREATE POLICY "Users can view own cycles" ON public.cycles FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own cycles" ON public.cycles FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own cycles" ON public.cycles FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own cycles" ON public.cycles FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies - bleeding_logs
CREATE POLICY "Users can view own bleeding logs" ON public.bleeding_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own bleeding logs" ON public.bleeding_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own bleeding logs" ON public.bleeding_logs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own bleeding logs" ON public.bleeding_logs FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies - cycle_symptom_logs
CREATE POLICY "Users can view own symptom logs" ON public.cycle_symptom_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own symptom logs" ON public.cycle_symptom_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own symptom logs" ON public.cycle_symptom_logs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own symptom logs" ON public.cycle_symptom_logs FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies - fertility_signals
CREATE POLICY "Users can view own fertility signals" ON public.fertility_signals FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own fertility signals" ON public.fertility_signals FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own fertility signals" ON public.fertility_signals FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own fertility signals" ON public.fertility_signals FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies - cycle_predictions
CREATE POLICY "Users can view own predictions" ON public.cycle_predictions FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own predictions" ON public.cycle_predictions FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_cycle_preferences_updated_at ON public.cycle_preferences;
CREATE TRIGGER update_cycle_preferences_updated_at BEFORE UPDATE ON public.cycle_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycles_updated_at ON public.cycles;
CREATE TRIGGER update_cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bleeding_logs_updated_at ON public.bleeding_logs;
CREATE TRIGGER update_bleeding_logs_updated_at BEFORE UPDATE ON public.bleeding_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycle_symptom_logs_updated_at ON public.cycle_symptom_logs;
CREATE TRIGGER update_cycle_symptom_logs_updated_at BEFORE UPDATE ON public.cycle_symptom_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fertility_signals_updated_at ON public.fertility_signals;
CREATE TRIGGER update_fertility_signals_updated_at BEFORE UPDATE ON public.fertility_signals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();