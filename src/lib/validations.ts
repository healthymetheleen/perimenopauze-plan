/**
 * HormoonBalans Dagboek - Zod Validation Schemas
 * 
 * SECURITY: All user inputs must be validated before database operations.
 * PRIVACY: Never log validated health data to console.
 */

import { z } from 'zod';

// Enums
export const deliveryChannelSchema = z.enum(['in_app', 'push', 'email']);
export const cyclePhaseSchema = z.enum(['menstrual', 'follicular', 'ovulatory', 'luteal', 'unknown']);
export const redactionStatusSchema = z.enum(['raw', 'redacted', 'blocked']);

// Time validation (HH:MM or HH:MM:SS format)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const timeSchema = z.string().regex(timeRegex, 'Ongeldige tijd (gebruik HH:MM formaat)');

// ============================================
// MEAL VALIDATION
// ============================================

export const qualityFlagsSchema = z.object({
  veg_portions: z.number().min(0).max(20).optional(),
  caffeine_servings: z.number().min(0).max(20).optional(),
  alcohol_units: z.number().min(0).max(20).optional(),
  hydration_l: z.number().min(0).max(10).optional(),
}).strict();

export const mealFormSchema = z.object({
  time_local: timeSchema.nullable().optional(),
  kcal: z.number().min(0).max(5000).nullable().optional(),
  protein_g: z.number().min(0).max(500).nullable().optional(),
  carbs_g: z.number().min(0).max(1000).nullable().optional(),
  fat_g: z.number().min(0).max(500).nullable().optional(),
  fiber_g: z.number().min(0).max(200).nullable().optional(),
  ultra_processed_level: z.number().min(0).max(3).nullable().optional(),
  quality_flags: qualityFlagsSchema.optional(),
});

export type MealFormData = z.infer<typeof mealFormSchema>;

// ============================================
// SYMPTOM VALIDATION
// ============================================

export const symptomFormSchema = z.object({
  symptom_code: z.string().min(1, 'Selecteer een klacht').max(50),
  severity_0_10: z.number().min(0, 'Minimaal 0').max(10, 'Maximaal 10'),
  timing: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type SymptomFormData = z.infer<typeof symptomFormSchema>;

// ============================================
// CONTEXT VALIDATION
// ============================================

export const contextFormSchema = z.object({
  sleep_duration_h: z.number().min(0).max(24).nullable().optional(),
  sleep_quality_0_10: z.number().min(0).max(10).nullable().optional(),
  stress_0_10: z.number().min(0).max(10).nullable().optional(),
  steps: z.number().min(0).max(100000).int().nullable().optional(),
  cycle_day: z.number().min(1).max(60).int().nullable().optional(),
  cycle_phase: cyclePhaseSchema.nullable().optional(),
});

export type ContextFormData = z.infer<typeof contextFormSchema>;

// ============================================
// PREFERENCES VALIDATION
// ============================================

export const preferencesFormSchema = z.object({
  timezone: z.string().min(1).max(100).default('Europe/Amsterdam'),
  digest_enabled: z.boolean().default(true),
  digest_time_local: timeSchema.default('08:30'),
  delivery_channel: deliveryChannelSchema.default('in_app'),
  email_enabled: z.boolean().default(false),
  push_enabled: z.boolean().default(false),
});

export type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

// ============================================
// NOTE VALIDATION
// ============================================

export const noteFormSchema = z.object({
  content: z.string()
    .min(1, 'Notitie mag niet leeg zijn')
    .max(4000, 'Notitie mag maximaal 4000 tekens bevatten')
    .trim(),
});

export type NoteFormData = z.infer<typeof noteFormSchema>;

// ============================================
// PROFILE VALIDATION
// ============================================

export const profileFormSchema = z.object({
  display_name: z.string()
    .min(1, 'Naam is verplicht')
    .max(100, 'Naam mag maximaal 100 tekens bevatten')
    .trim()
    .nullable()
    .optional(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

// ============================================
// AUTH VALIDATION
// ============================================

export const loginFormSchema = z.object({
  email: z.string()
    .min(1, 'E-mail is verplicht')
    .email('Ongeldig e-mailadres')
    .max(255, 'E-mail mag maximaal 255 tekens bevatten')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, 'Wachtwoord moet minimaal 8 tekens bevatten')
    .max(128, 'Wachtwoord mag maximaal 128 tekens bevatten'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

export const signupFormSchema = loginFormSchema.extend({
  display_name: z.string()
    .min(1, 'Naam is verplicht')
    .max(100, 'Naam mag maximaal 100 tekens bevatten')
    .trim()
    .optional(),
});

export type SignupFormData = z.infer<typeof signupFormSchema>;

// ============================================
// DATE VALIDATION
// ============================================

export const dateParamSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Ongeldige datum (gebruik YYYY-MM-DD formaat)'
);

// ============================================
// HELPER: Safe parse with error messages
// ============================================

export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
  
  return { success: false, errors };
}
