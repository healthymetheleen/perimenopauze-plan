-- Perimenopauze Plan Database Schema
-- PostgreSQL 17

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for AI features
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable PostGIS for location features (if needed)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  height DECIMAL(5,2), -- in cm
  weight DECIMAL(5,2), -- in kg
  language VARCHAR(10) DEFAULT 'nl',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Diary entries table
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  content TEXT,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  symptoms TEXT[], -- Array of symptom strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_diary_user_date ON diary_entries(user_id, entry_date DESC);

-- Cycle data table
CREATE TABLE IF NOT EXISTS cycle_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  flow_intensity INTEGER CHECK (flow_intensity BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cycle_user_date ON cycle_data(user_id, start_date DESC);

-- Symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symptom_date DATE NOT NULL,
  symptom_type VARCHAR(100) NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_symptoms_user_date ON symptoms(user_id, symptom_date DESC);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL,
  instructions TEXT[] NOT NULL,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  servings INTEGER DEFAULT 1,
  calories_per_serving INTEGER,
  proteins_per_serving DECIMAL(5,2),
  carbs_per_serving DECIMAL(5,2),
  fats_per_serving DECIMAL(5,2),
  image_url TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_public ON recipes(is_public);

-- Meal logs table
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_time VARCHAR(20) CHECK (meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  calories INTEGER,
  proteins DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fats DECIMAL(5,2),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, meal_date DESC);

-- Sleep logs table
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_date DATE NOT NULL,
  bedtime TIME NOT NULL,
  wake_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  quality INTEGER CHECK (quality BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sleep_logs_user_date ON sleep_logs(user_id, sleep_date DESC);

-- Movement logs table
CREATE TABLE IF NOT EXISTS movement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 5),
  calories_burned INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movement_logs_user_date ON movement_logs(user_id, activity_date DESC);

-- Subscriptions table (for Mollie payments)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mollie_customer_id VARCHAR(255),
  mollie_subscription_id VARCHAR(255),
  plan_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- AI Prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_key VARCHAR(100) UNIQUE NOT NULL,
  prompt_text TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- List of variables that can be replaced in the prompt
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);

-- Community comments table
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diary_entries_updated_at BEFORE UPDATE ON diary_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cycle_data_updated_at BEFORE UPDATE ON cycle_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_logs_updated_at BEFORE UPDATE ON meal_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sleep_logs_updated_at BEFORE UPDATE ON sleep_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movement_logs_updated_at BEFORE UPDATE ON movement_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_comments_updated_at BEFORE UPDATE ON community_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
