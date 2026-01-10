-- Migration: Add admin role to users
-- Allows certain users to access admin dashboard

-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Create admin_logs table to track admin actions
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  target_table VARCHAR(100),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_user ON admin_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_logs_action ON admin_logs(action_type, created_at DESC);

-- Make the first user (you) an admin
-- Replace with your actual email address
-- UPDATE users SET is_admin = TRUE WHERE email = 'jouw@email.nl';

-- Example: To make yourself admin, run this after creating your account:
-- UPDATE users SET is_admin = TRUE WHERE email = 'heleen@perimenopauzeplan.nl';
