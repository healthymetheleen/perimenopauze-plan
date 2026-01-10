import { Request } from 'express';

// User types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  is_premium: boolean;
  is_admin: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  date_of_birth: Date | null;
  height: number | null;
  weight: number | null;
  language: string;
  notifications_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// Auth types
export interface JWTPayload {
  userId: string;
  email: string;
  is_premium: boolean;
  is_admin?: boolean;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Diary types
export interface DiaryEntry {
  id: string;
  user_id: string;
  entry_date: Date;
  content: string;
  mood: number | null;
  energy_level: number | null;
  symptoms: string[];
  created_at: Date;
  updated_at: Date;
}

// Cycle types
export interface CycleData {
  id: string;
  user_id: string;
  start_date: Date;
  end_date: Date | null;
  flow_intensity: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Meal types
export interface MealLog {
  id: string;
  user_id: string;
  meal_date: Date;
  meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  photo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

// Recipe types
export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  calories_per_serving: number | null;
  image_url: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

// Sleep types
export interface SleepLog {
  id: string;
  user_id: string;
  sleep_date: Date;
  bedtime: string;
  wake_time: string;
  duration_hours: number;
  quality: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Movement types
export interface MovementLog {
  id: string;
  user_id: string;
  activity_date: Date;
  activity_type: string;
  duration_minutes: number;
  intensity: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
