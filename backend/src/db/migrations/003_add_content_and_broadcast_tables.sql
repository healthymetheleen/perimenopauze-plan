-- Migration: Add content management and broadcast tables
-- For admin to manage all content and send broadcasts

-- ============================================
-- MEDITATIES
-- ============================================

CREATE TABLE IF NOT EXISTS meditations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  audio_url TEXT,
  script TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('breathing', 'body_scan', 'visualization', 'mindfulness')),
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meditations_category ON meditations(category);
CREATE INDEX idx_meditations_premium ON meditations(is_premium);

-- ============================================
-- BEWEGINGEN/EXERCISES
-- ============================================

CREATE TABLE IF NOT EXISTS movement_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  video_url TEXT,
  instructions TEXT[] NOT NULL,
  difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('cardio', 'strength', 'flexibility', 'yoga', 'pilates')),
  equipment_needed TEXT[],
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movement_exercises_category ON movement_exercises(category);
CREATE INDEX idx_movement_exercises_difficulty ON movement_exercises(difficulty);
CREATE INDEX idx_movement_exercises_premium ON movement_exercises(is_premium);

-- ============================================
-- EDUCATIE ARTIKELEN
-- ============================================

CREATE TABLE IF NOT EXISTS education_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('symptoms', 'hormones', 'lifestyle', 'treatments')),
  reading_time_minutes INTEGER NOT NULL,
  author VARCHAR(255),
  image_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_education_articles_category ON education_articles(category);
CREATE INDEX idx_education_articles_premium ON education_articles(is_premium);

-- ============================================
-- RECIPES (Update existing table if needed)
-- ============================================

-- Add category column if it doesn't exist
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS category VARCHAR(50) CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack', 'dessert'));

-- ============================================
-- BROADCASTS (Admin Messages to Users)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('all', 'premium', 'free', 'custom')),
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_broadcasts_admin ON broadcasts(admin_user_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_broadcasts_scheduled ON broadcasts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ============================================
-- BROADCAST RECIPIENTS (Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_user ON broadcast_recipients(user_id);
CREATE INDEX idx_broadcast_recipients_status ON broadcast_recipients(status);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Trigger function already exists from previous migration
-- Apply to new tables

CREATE TRIGGER update_meditations_updated_at BEFORE UPDATE ON meditations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movement_exercises_updated_at BEFORE UPDATE ON movement_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_articles_updated_at BEFORE UPDATE ON education_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON broadcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Sample meditation
INSERT INTO meditations (title, description, duration_minutes, script, category, is_premium)
VALUES (
  'Ademhalingsoefening voor beginners',
  'Een eenvoudige ademhalingsoefening om te ontspannen en stress te verminderen',
  5,
  'Ga comfortabel zitten. Sluit je ogen. Adem diep in door je neus (1-2-3-4). Houd vast (1-2). Adem langzaam uit door je mond (1-2-3-4-5-6). Herhaal dit 10 keer.',
  'breathing',
  FALSE
)
ON CONFLICT DO NOTHING;

-- Sample movement exercise
INSERT INTO movement_exercises (title, description, duration_minutes, instructions, difficulty, category, equipment_needed, is_premium)
VALUES (
  'Yoga voor beginners',
  'Een zachte yogasessie speciaal voor perimenopauze',
  15,
  ARRAY[
    'Start met berghouding (Tadasana)',
    'Ga naar katten-koehouding voor rugmobiliteit',
    'Doe de kinderhouding voor ontspanning',
    'Eindig met liggende vlinder voor heupopening'
  ],
  'beginner',
  'yoga',
  ARRAY['yogamat'],
  FALSE
)
ON CONFLICT DO NOTHING;

-- Sample education article
INSERT INTO education_articles (title, content, category, reading_time_minutes, author, is_premium)
VALUES (
  'Wat is perimenopauze?',
  'Perimenopauze is de overgangsfase naar de menopauze. Deze periode kan 4-10 jaar duren en begint gemiddeld rond het 45e levensjaar. Tijdens de perimenopauze fluctueren hormonen, wat verschillende symptomen kan veroorzaken zoals opvliegers, stemmingswisselingen, slaapproblemen en onregelmatige menstruatie.',
  'symptoms',
  3,
  'Dr. Lisa van der Berg',
  FALSE
)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed successfully!';
  RAISE NOTICE 'Created tables: meditations, movement_exercises, education_articles, broadcasts, broadcast_recipients';
  RAISE NOTICE 'Admin can now manage all content via /api/admin-content';
  RAISE NOTICE 'Admin can send broadcasts via /api/admin-broadcast';
END $$;
