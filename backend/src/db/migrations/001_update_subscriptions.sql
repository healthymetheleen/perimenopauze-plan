-- Migration: Update subscriptions table for Mollie integration
-- Add missing columns for complete payment tracking

-- Add missing columns
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS mollie_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS interval_months INTEGER,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMP WITH TIME ZONE;

-- Remove unique constraint on user_id (users can have multiple subscriptions over time)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

-- Create AI chat logs table for rate limiting
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokens_used INTEGER DEFAULT 0,
  context_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_chat_logs_user_date ON ai_chat_logs(user_id, created_at DESC);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_payment ON subscriptions(mollie_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);
