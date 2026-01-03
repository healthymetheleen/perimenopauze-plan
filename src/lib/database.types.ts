/**
 * HormoonBalans Dagboek - Database Types
 * Generated for schema: app
 * 
 * PRIVACY NOTE: These types are for synthetic mock data only.
 * Never log health content (macros, symptoms, notes).
 */

// Enums
export type DeliveryChannel = 'in_app' | 'push' | 'email';
export type NotificationStatus = 'queued' | 'processing' | 'sent' | 'failed';
export type RedactionStatus = 'raw' | 'redacted' | 'blocked';
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';

// Symptom domains for grouping
export type SymptomDomain = 
  | 'vasomotor'
  | 'sleep'
  | 'mood'
  | 'cognitive'
  | 'energy'
  | 'metabolic'
  | 'menstrual'
  | 'digestive'
  | 'urogenital'
  | 'dermatological';

// Score reason codes
export type ScoreReasonCode = 
  | 'low_protein'
  | 'low_fiber'
  | 'many_eating_moments'
  | 'high_carb_without_protein'
  | 'late_eating'
  | 'very_low_kcal'
  | 'very_high_kcal'
  | 'sleep_low'
  | 'stress_high'
  | 'reduce_ultra_processed';

// Base table types
export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  owner_id: string;
  timezone: string;
  digest_enabled: boolean;
  digest_time_local: string;
  delivery_channel: DeliveryChannel;
  email_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiaryDay {
  id: string;
  owner_id: string;
  day_date: string;
  timezone: string;
  data_quality: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SymptomCatalog {
  code: string;
  domain: SymptomDomain;
  label_nl: string;
  description_nl: string | null;
  is_active: boolean;
}

export interface Meal {
  id: string;
  owner_id: string;
  day_id: string;
  time_local: string | null;
  source: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  ultra_processed_level: number | null;
  quality_flags: QualityFlags;
  created_at: string;
  updated_at: string;
}

export interface QualityFlags {
  veg_portions?: number;
  caffeine_servings?: number;
  alcohol_units?: number;
  hydration_l?: number;
}

export interface Symptom {
  id: string;
  owner_id: string;
  day_id: string;
  symptom_code: string;
  severity_0_10: number;
  timing: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyContext {
  id: string;
  owner_id: string;
  day_id: string;
  sleep_duration_h: number | null;
  sleep_quality_0_10: number | null;
  stress_0_10: number | null;
  steps: number | null;
  cycle_day: number | null;
  cycle_phase: CyclePhase | null;
  created_at: string;
  updated_at: string;
}

export interface NotePrivate {
  id: string;
  owner_id: string;
  day_id: string;
  content: string;
  redaction_status: RedactionStatus;
  created_at: string;
  updated_at: string;
}

export interface CopyCatalog {
  code: string;
  title_nl: string;
  body_nl: string;
  action_title_nl: string | null;
  action_body_nl: string | null;
  severity: number;
  category: string;
  is_active: boolean;
}

export interface Notification {
  id: string;
  owner_id: string;
  type: string;
  channel: DeliveryChannel;
  scheduled_at: string;
  status: NotificationStatus;
  attempts: number;
  payload: Record<string, unknown>;
  sent_at: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  owner_id: string;
  event_type: string;
  meta: Record<string, unknown>;
  created_at: string;
}

// View types
export interface DailySummary {
  day_id: string;
  owner_id: string;
  day_date: string;
  timezone: string;
  data_quality: Record<string, unknown>;
  meals_count: number;
  kcal_total: number;
  protein_g: number;
  fiber_g: number;
  carbs_g: number;
  fat_g: number;
  first_meal_time: string | null;
  last_meal_time: string | null;
  eating_window_h: number | null;
  avg_ultra_processed: number | null;
  late_eating_flag: boolean;
  many_eating_moments_flag: boolean;
  sleep_duration_h: number | null;
  sleep_quality_0_10: number | null;
  stress_0_10: number | null;
  steps: number | null;
  cycle_day: number | null;
  cycle_phase: CyclePhase | null;
  symptoms: SymptomEntry[];
  created_at: string;
  updated_at: string;
}

export interface SymptomEntry {
  code: string;
  severity: number;
}

export interface DailyScore {
  day_id: string;
  owner_id: string;
  day_date: string;
  day_score: number;
  score_reasons: ScoreReasonCode[];
  meals_count: number;
  kcal_total: number;
  protein_g: number;
  fiber_g: number;
  eating_window_h: number | null;
  first_meal_time: string | null;
  last_meal_time: string | null;
  sleep_duration_h: number | null;
  sleep_quality_0_10: number | null;
  stress_0_10: number | null;
  steps: number | null;
  cycle_phase: CyclePhase | null;
  symptoms: SymptomEntry[];
}

export interface TrendDay {
  day_date: string;
  day_score: number;
  protein_g: number;
  fiber_g: number;
  meals_count: number;
  sleep_quality_0_10: number | null;
  stress_0_10: number | null;
  cycle_phase: CyclePhase | null;
}

export interface SymptomPattern {
  symptom_code: string;
  label_nl: string;
  domain: SymptomDomain;
  days_high_severity: number;
  days_low_severity: number;
  protein_g_high: number;
  protein_g_low: number;
  fiber_g_high: number;
  fiber_g_low: number;
  late_eating_pct_high: number;
  late_eating_pct_low: number;
}

// API response type
export interface DailySummaryResponse {
  date: string;
  score: number;
  score_reasons: ScoreReasonCode[];
  intake: {
    meals_count: number;
    kcal: number;
    protein_g: number;
    fiber_g: number;
  };
  timing: {
    first_meal: string | null;
    last_meal: string | null;
    eating_window_h: number | null;
  };
  context: {
    sleep_duration_h: number | null;
    sleep_quality: number | null;
    stress: number | null;
    steps: number | null;
    cycle_phase: CyclePhase | null;
  };
  symptoms: SymptomEntry[];
}

// Insert types (for creating new records)
export interface MealInsert {
  day_id: string;
  owner_id: string;
  time_local?: string | null;
  source?: string;
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  ultra_processed_level?: number | null;
  quality_flags?: QualityFlags;
}

export interface SymptomInsert {
  day_id: string;
  owner_id: string;
  symptom_code: string;
  severity_0_10: number;
  timing?: string | null;
  tags?: string[];
}

export interface DailyContextInsert {
  day_id: string;
  owner_id: string;
  sleep_duration_h?: number | null;
  sleep_quality_0_10?: number | null;
  stress_0_10?: number | null;
  steps?: number | null;
  cycle_day?: number | null;
  cycle_phase?: CyclePhase | null;
}

export interface UserPreferencesInsert {
  owner_id: string;
  timezone?: string;
  digest_enabled?: boolean;
  digest_time_local?: string;
  delivery_channel?: DeliveryChannel;
  email_enabled?: boolean;
  push_enabled?: boolean;
}
