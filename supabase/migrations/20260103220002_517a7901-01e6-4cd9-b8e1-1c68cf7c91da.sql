-- Create user_consents table in public schema
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_privacy BOOLEAN NOT NULL DEFAULT false,
  accepted_terms BOOLEAN NOT NULL DEFAULT false,
  accepted_disclaimer BOOLEAN NOT NULL DEFAULT false,
  accepted_health_data_processing BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- Create entitlements table
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_use_trends BOOLEAN NOT NULL DEFAULT false,
  can_use_patterns BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- Create diary_days table
CREATE TABLE IF NOT EXISTS public.diary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
  data_quality JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, day_date)
);

-- Create unique index for composite FK
CREATE UNIQUE INDEX IF NOT EXISTS idx_diary_days_id_owner ON public.diary_days(id, owner_id);

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id UUID NOT NULL,
  time_local TIME,
  source TEXT NOT NULL DEFAULT 'manual',
  kcal NUMERIC CHECK (kcal IS NULL OR kcal >= 0),
  protein_g NUMERIC CHECK (protein_g IS NULL OR protein_g >= 0),
  carbs_g NUMERIC CHECK (carbs_g IS NULL OR carbs_g >= 0),
  fat_g NUMERIC CHECK (fat_g IS NULL OR fat_g >= 0),
  fiber_g NUMERIC CHECK (fiber_g IS NULL OR fiber_g >= 0),
  ultra_processed_level SMALLINT CHECK (ultra_processed_level IS NULL OR (ultra_processed_level >= 0 AND ultra_processed_level <= 3)),
  quality_flags JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (day_id, owner_id) REFERENCES public.diary_days(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meals_day ON public.meals(day_id);

-- Create symptom_catalog table
CREATE TABLE IF NOT EXISTS public.symptom_catalog (
  code TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  label_nl TEXT NOT NULL,
  description_nl TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create symptoms table
CREATE TABLE IF NOT EXISTS public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id UUID NOT NULL,
  symptom_code TEXT NOT NULL REFERENCES public.symptom_catalog(code),
  severity_0_10 SMALLINT NOT NULL CHECK (severity_0_10 >= 0 AND severity_0_10 <= 10),
  timing TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (day_id, owner_id) REFERENCES public.diary_days(id, owner_id) ON DELETE CASCADE
);

-- Create daily_context table
CREATE TABLE IF NOT EXISTS public.daily_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id UUID NOT NULL,
  sleep_duration_h NUMERIC,
  sleep_quality_0_10 SMALLINT CHECK (sleep_quality_0_10 IS NULL OR (sleep_quality_0_10 >= 0 AND sleep_quality_0_10 <= 10)),
  stress_0_10 SMALLINT CHECK (stress_0_10 IS NULL OR (stress_0_10 >= 0 AND stress_0_10 <= 10)),
  steps INTEGER,
  cycle_day SMALLINT CHECK (cycle_day IS NULL OR (cycle_day >= 1 AND cycle_day <= 60)),
  cycle_phase TEXT CHECK (cycle_phase IS NULL OR cycle_phase IN ('menstrual', 'follicular', 'ovulatory', 'luteal', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, day_id),
  FOREIGN KEY (day_id, owner_id) REFERENCES public.diary_days(id, owner_id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_context ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_consents
CREATE POLICY "Users can view own consent" ON public.user_consents FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own consent" ON public.user_consents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own consent" ON public.user_consents FOR UPDATE USING (auth.uid() = owner_id);

-- RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS policies for entitlements
CREATE POLICY "Users can view own entitlements" ON public.entitlements FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own entitlements" ON public.entitlements FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS policies for diary_days
CREATE POLICY "Users can view own diary days" ON public.diary_days FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own diary days" ON public.diary_days FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own diary days" ON public.diary_days FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own diary days" ON public.diary_days FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for meals
CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for symptoms
CREATE POLICY "Users can view own symptoms" ON public.symptoms FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own symptoms" ON public.symptoms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own symptoms" ON public.symptoms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own symptoms" ON public.symptoms FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for daily_context
CREATE POLICY "Users can view own context" ON public.daily_context FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own context" ON public.daily_context FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own context" ON public.daily_context FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own context" ON public.daily_context FOR DELETE USING (auth.uid() = owner_id);

-- Symptom catalog is read-only for users
CREATE POLICY "Anyone can view symptom catalog" ON public.symptom_catalog FOR SELECT USING (true);

-- Seed symptom catalog
INSERT INTO public.symptom_catalog (code, domain, label_nl, description_nl) VALUES
  ('hot_flashes', 'vasomotor', 'Opvliegers', 'Plotselinge warmtegolven'),
  ('night_sweats', 'vasomotor', 'Nachtelijk zweten', 'Overmatig zweten tijdens slaap'),
  ('sleep_onset_delay', 'sleep', 'Moeite met inslapen', 'Langer dan 30 min nodig om in slaap te vallen'),
  ('night_awakenings', 'sleep', 'Nachtelijk wakker worden', 'Meerdere keren wakker worden'),
  ('early_morning_waking', 'sleep', 'Vroeg wakker worden', 'Te vroeg wakker en niet meer kunnen slapen'),
  ('unrefreshing_sleep', 'sleep', 'Niet uitgerust wakker', 'Ondanks slaap nog moe'),
  ('irritability', 'mood', 'Prikkelbaarheid', 'Sneller geïrriteerd'),
  ('anxiety', 'mood', 'Angstgevoelens', 'Onrust of bezorgdheid'),
  ('low_mood', 'mood', 'Sombere stemming', 'Neerslachtig gevoel'),
  ('mood_swings', 'mood', 'Stemmingswisselingen', 'Snelle wisselingen in stemming'),
  ('brain_fog', 'cognitive', 'Hersenmist', 'Wazig of troebel denken'),
  ('poor_focus', 'cognitive', 'Concentratieproblemen', 'Moeite met focussen'),
  ('memory_lapses', 'cognitive', 'Geheugenproblemen', 'Dingen vergeten'),
  ('fatigue', 'energy', 'Vermoeidheid', 'Algemene moeheid'),
  ('afternoon_crash', 'energy', 'Middagdip', 'Energieverlies in de middag'),
  ('low_morning_energy', 'energy', 'Lage ochtendenergie', 'Traag op gang komen'),
  ('cravings_sweet', 'metabolic', 'Suikerbehoefte', 'Trek in zoet'),
  ('blood_sugar_swings', 'metabolic', 'Bloedsuikerschommelingen', 'Onrustige bloedsuiker'),
  ('water_retention', 'metabolic', 'Vochtophoping', 'Opgezwollen gevoel'),
  ('weight_gain', 'metabolic', 'Gewichtstoename', 'Onverklaarde toename'),
  ('irregular_cycle', 'menstrual', 'Onregelmatige cyclus', 'Wisselende cyclusduur'),
  ('spotting', 'menstrual', 'Spotting', 'Tussentijds bloedverlies'),
  ('heavy_bleeding', 'menstrual', 'Hevig bloedverlies', 'Meer dan normaal'),
  ('menstrual_cramps', 'menstrual', 'Menstruatiekrampen', 'Buikkrampen'),
  ('pms', 'menstrual', 'PMS klachten', 'Premenstrueel syndroom'),
  ('breast_tenderness', 'menstrual', 'Gevoelige borsten', 'Spanning in borsten'),
  ('bloating', 'digestive', 'Opgeblazen gevoel', 'Vol gevoel in buik'),
  ('constipation', 'digestive', 'Obstipatie', 'Trage stoelgang'),
  ('reflux', 'digestive', 'Reflux', 'Zuurbranden'),
  ('low_libido', 'urogenital', 'Verminderd libido', 'Minder zin in intimiteit'),
  ('vaginal_dryness', 'urogenital', 'Vaginale droogheid', 'Droogheid'),
  ('urinary_urgency', 'urogenital', 'Aandrang', 'Vaker naar toilet moeten'),
  ('hair_shedding', 'dermatological', 'Haaruitval', 'Meer haarverlies'),
  ('dry_skin', 'dermatological', 'Droge huid', 'Schrale huid'),
  ('acne', 'dermatological', 'Acne', 'Huidonzuiverheden')
ON CONFLICT (code) DO NOTHING;

-- Create view for active symptoms
CREATE OR REPLACE VIEW public.v_symptom_catalog AS
SELECT code, domain, label_nl, description_nl
FROM public.symptom_catalog
WHERE is_active = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_user_consents_updated_at ON public.user_consents;
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON public.user_consents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_entitlements_updated_at ON public.entitlements;
CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_diary_days_updated_at ON public.diary_days;
CREATE TRIGGER update_diary_days_updated_at BEFORE UPDATE ON public.diary_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_meals_updated_at ON public.meals;
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON public.meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_symptoms_updated_at ON public.symptoms;
CREATE TRIGGER update_symptoms_updated_at BEFORE UPDATE ON public.symptoms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_context_updated_at ON public.daily_context;
CREATE TRIGGER update_daily_context_updated_at BEFORE UPDATE ON public.daily_context FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for daily scores (simplified version)
CREATE OR REPLACE VIEW public.v_daily_scores AS
SELECT 
  d.id as day_id,
  d.owner_id,
  d.day_date,
  COALESCE(
    GREATEST(0, 10 
      - CASE WHEN COALESCE(SUM(m.protein_g), 0) < 70 THEN 2 ELSE 0 END
      - CASE WHEN COALESCE(SUM(m.fiber_g), 0) < 25 THEN 1 ELSE 0 END
      - CASE WHEN COUNT(m.id) >= 7 THEN 2 ELSE 0 END
      - CASE WHEN MAX(m.time_local) >= '21:00' THEN 1 ELSE 0 END
    ), 0
  ) as day_score,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(SUM(m.protein_g), 0) < 70 THEN 'low_protein' END,
    CASE WHEN COALESCE(SUM(m.fiber_g), 0) < 25 THEN 'low_fiber' END,
    CASE WHEN COUNT(m.id) >= 7 THEN 'many_eating_moments' END,
    CASE WHEN MAX(m.time_local) >= '21:00' THEN 'late_eating' END
  ], NULL) as score_reasons,
  COUNT(m.id)::int as meals_count,
  COALESCE(SUM(m.protein_g), 0) as protein_g,
  COALESCE(SUM(m.fiber_g), 0) as fiber_g
FROM public.diary_days d
LEFT JOIN public.meals m ON m.day_id = d.id
GROUP BY d.id, d.owner_id, d.day_date;