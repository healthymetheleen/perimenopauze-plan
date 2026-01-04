export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_insights_cache: {
        Row: {
          created_at: string
          id: string
          input_hash: string | null
          insight_data: Json
          insight_date: string
          insight_type: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_hash?: string | null
          insight_data: Json
          insight_date?: string
          insight_type: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_hash?: string | null
          insight_data?: Json
          insight_date?: string
          insight_type?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          function_name: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bleeding_logs: {
        Row: {
          created_at: string
          id: string
          intensity: string
          is_intermenstrual: boolean | null
          log_date: string
          notes: string | null
          owner_id: string
          pain_score: number | null
          retention_until: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intensity: string
          is_intermenstrual?: boolean | null
          log_date: string
          notes?: string | null
          owner_id: string
          pain_score?: number | null
          retention_until?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intensity?: string
          is_intermenstrual?: boolean | null
          log_date?: string
          notes?: string | null
          owner_id?: string
          pain_score?: number | null
          retention_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          owner_id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          owner_id: string
          post_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          owner_id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          comments_count: number
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          likes_count: number
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          likes_count?: number
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          likes_count?: number
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_history: {
        Row: {
          consent_given: boolean
          consent_type: string
          consent_version: string
          created_at: string | null
          id: string
          ip_address: unknown
          owner_id: string
          user_agent: string | null
        }
        Insert: {
          consent_given: boolean
          consent_type: string
          consent_version: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          owner_id: string
          user_agent?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_type?: string
          consent_version?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          owner_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      cycle_predictions: {
        Row: {
          ai_tips: Json | null
          avg_cycle_length: number | null
          created_at: string
          current_phase: string
          current_season: string
          cycle_variability: number | null
          fertile_confidence: number | null
          fertile_window_end: string | null
          fertile_window_start: string | null
          generated_at: string
          id: string
          next_period_confidence: number | null
          next_period_start_max: string | null
          next_period_start_min: string | null
          ovulation_confidence: number | null
          ovulation_max: string | null
          ovulation_min: string | null
          owner_id: string
          rationale: string | null
          watchouts: string[] | null
        }
        Insert: {
          ai_tips?: Json | null
          avg_cycle_length?: number | null
          created_at?: string
          current_phase: string
          current_season: string
          cycle_variability?: number | null
          fertile_confidence?: number | null
          fertile_window_end?: string | null
          fertile_window_start?: string | null
          generated_at?: string
          id?: string
          next_period_confidence?: number | null
          next_period_start_max?: string | null
          next_period_start_min?: string | null
          ovulation_confidence?: number | null
          ovulation_max?: string | null
          ovulation_min?: string | null
          owner_id: string
          rationale?: string | null
          watchouts?: string[] | null
        }
        Update: {
          ai_tips?: Json | null
          avg_cycle_length?: number | null
          created_at?: string
          current_phase?: string
          current_season?: string
          cycle_variability?: number | null
          fertile_confidence?: number | null
          fertile_window_end?: string | null
          fertile_window_start?: string | null
          generated_at?: string
          id?: string
          next_period_confidence?: number | null
          next_period_start_max?: string | null
          next_period_start_min?: string | null
          ovulation_confidence?: number | null
          ovulation_max?: string | null
          ovulation_min?: string | null
          owner_id?: string
          rationale?: string | null
          watchouts?: string[] | null
        }
        Relationships: []
      }
      cycle_preferences: {
        Row: {
          avg_cycle_length: number | null
          avg_period_length: number | null
          breastfeeding: boolean | null
          created_at: string
          cycle_variability: number | null
          has_iud: boolean | null
          hormonal_contraception: boolean | null
          id: string
          luteal_phase_length: number | null
          onboarding_completed: boolean | null
          owner_id: string
          pcos: boolean | null
          perimenopause: boolean | null
          recently_pregnant: boolean | null
          reminders_enabled: boolean | null
          show_fertile_days: boolean | null
          updated_at: string
        }
        Insert: {
          avg_cycle_length?: number | null
          avg_period_length?: number | null
          breastfeeding?: boolean | null
          created_at?: string
          cycle_variability?: number | null
          has_iud?: boolean | null
          hormonal_contraception?: boolean | null
          id?: string
          luteal_phase_length?: number | null
          onboarding_completed?: boolean | null
          owner_id: string
          pcos?: boolean | null
          perimenopause?: boolean | null
          recently_pregnant?: boolean | null
          reminders_enabled?: boolean | null
          show_fertile_days?: boolean | null
          updated_at?: string
        }
        Update: {
          avg_cycle_length?: number | null
          avg_period_length?: number | null
          breastfeeding?: boolean | null
          created_at?: string
          cycle_variability?: number | null
          has_iud?: boolean | null
          hormonal_contraception?: boolean | null
          id?: string
          luteal_phase_length?: number | null
          onboarding_completed?: boolean | null
          owner_id?: string
          pcos?: boolean | null
          perimenopause?: boolean | null
          recently_pregnant?: boolean | null
          reminders_enabled?: boolean | null
          show_fertile_days?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      cycle_symptom_logs: {
        Row: {
          anxiety: boolean | null
          bloating: boolean | null
          breast_tender: boolean | null
          cravings: string | null
          created_at: string
          energy: number | null
          headache: boolean | null
          hot_flashes: boolean | null
          id: string
          irritability: boolean | null
          libido: number | null
          log_date: string
          mood: number | null
          notes: string | null
          owner_id: string
          retention_until: string | null
          sleep_quality: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          anxiety?: boolean | null
          bloating?: boolean | null
          breast_tender?: boolean | null
          cravings?: string | null
          created_at?: string
          energy?: number | null
          headache?: boolean | null
          hot_flashes?: boolean | null
          id?: string
          irritability?: boolean | null
          libido?: number | null
          log_date: string
          mood?: number | null
          notes?: string | null
          owner_id: string
          retention_until?: string | null
          sleep_quality?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          anxiety?: boolean | null
          bloating?: boolean | null
          breast_tender?: boolean | null
          cravings?: string | null
          created_at?: string
          energy?: number | null
          headache?: boolean | null
          hot_flashes?: boolean | null
          id?: string
          irritability?: boolean | null
          libido?: number | null
          log_date?: string
          mood?: number | null
          notes?: string | null
          owner_id?: string
          retention_until?: string | null
          sleep_quality?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          computed_cycle_length: number | null
          created_at: string
          end_date: string | null
          id: string
          is_anovulatory: boolean | null
          notes: string | null
          owner_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          computed_cycle_length?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_anovulatory?: boolean | null
          notes?: string | null
          owner_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          computed_cycle_length?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_anovulatory?: boolean | null
          notes?: string | null
          owner_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_context: {
        Row: {
          created_at: string
          cycle_day: number | null
          cycle_phase: string | null
          day_id: string
          id: string
          owner_id: string
          sleep_duration_h: number | null
          sleep_quality_0_10: number | null
          steps: number | null
          stress_0_10: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_day?: number | null
          cycle_phase?: string | null
          day_id: string
          id?: string
          owner_id: string
          sleep_duration_h?: number | null
          sleep_quality_0_10?: number | null
          steps?: number | null
          stress_0_10?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_day?: number | null
          cycle_phase?: string | null
          day_id?: string
          id?: string
          owner_id?: string
          sleep_duration_h?: number | null
          sleep_quality_0_10?: number | null
          steps?: number | null
          stress_0_10?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_context_day_id_owner_id_fkey"
            columns: ["day_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "diary_days"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "daily_context_day_id_owner_id_fkey"
            columns: ["day_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "v_daily_scores"
            referencedColumns: ["day_id", "owner_id"]
          },
        ]
      }
      diary_days: {
        Row: {
          created_at: string
          data_quality: Json
          day_date: string
          id: string
          owner_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_quality?: Json
          day_date: string
          id?: string
          owner_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_quality?: Json
          day_date?: string
          id?: string
          owner_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          can_export: boolean
          can_use_patterns: boolean
          can_use_trends: boolean
          created_at: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          can_export?: boolean
          can_use_patterns?: boolean
          can_use_trends?: boolean
          created_at?: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          can_export?: boolean
          can_use_patterns?: boolean
          can_use_trends?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          benefits: string[] | null
          created_at: string
          cycle_phase: string
          description: string | null
          difficulty: string
          duration: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_dutch: string
          sort_order: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string
          cycle_phase: string
          description?: string | null
          difficulty: string
          duration: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_dutch: string
          sort_order?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          benefits?: string[] | null
          created_at?: string
          cycle_phase?: string
          description?: string | null
          difficulty?: string
          duration?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_dutch?: string
          sort_order?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      fertility_signals: {
        Row: {
          bbt: number | null
          cervical_mucus: string | null
          created_at: string
          id: string
          lh_test: string | null
          log_date: string
          owner_id: string
          resting_hr: number | null
          training_load: number | null
          updated_at: string
        }
        Insert: {
          bbt?: number | null
          cervical_mucus?: string | null
          created_at?: string
          id?: string
          lh_test?: string | null
          log_date: string
          owner_id: string
          resting_hr?: number | null
          training_load?: number | null
          updated_at?: string
        }
        Update: {
          bbt?: number | null
          cervical_mucus?: string | null
          created_at?: string
          id?: string
          lh_test?: string | null
          log_date?: string
          owner_id?: string
          resting_hr?: number | null
          training_load?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          carbs_g: number | null
          created_at: string
          day_id: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          kcal: number | null
          owner_id: string
          protein_g: number | null
          quality_flags: Json
          retention_until: string | null
          source: string
          time_local: string | null
          ultra_processed_level: number | null
          updated_at: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          day_id: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          kcal?: number | null
          owner_id: string
          protein_g?: number | null
          quality_flags?: Json
          retention_until?: string | null
          source?: string
          time_local?: string | null
          ultra_processed_level?: number | null
          updated_at?: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          day_id?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          kcal?: number | null
          owner_id?: string
          protein_g?: number | null
          quality_flags?: Json
          retention_until?: string | null
          source?: string
          time_local?: string | null
          ultra_processed_level?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_day_id_owner_id_fkey"
            columns: ["day_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "diary_days"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "meals_day_id_owner_id_fkey"
            columns: ["day_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "v_daily_scores"
            referencedColumns: ["day_id", "owner_id"]
          },
        ]
      }
      meditations: {
        Row: {
          audio_url: string | null
          category: string
          created_at: string
          cycle_season: string | null
          description: string | null
          duration: string
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category: string
          created_at?: string
          cycle_season?: string | null
          description?: string | null
          duration: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category?: string
          created_at?: string
          cycle_season?: string | null
          description?: string | null
          duration?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_settings: {
        Row: {
          created_at: string
          diet_vision: string | null
          id: string
          important_points: Json | null
          less_important_points: Json | null
          no_go_items: Json | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_fiber_g: number | null
          target_kcal: number | null
          target_protein_g: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          diet_vision?: string | null
          id?: string
          important_points?: Json | null
          less_important_points?: Json | null
          no_go_items?: Json | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_fiber_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          diet_vision?: string | null
          id?: string
          important_points?: Json | null
          less_important_points?: Json | null
          no_go_items?: Json | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_fiber_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          carbs_g: number | null
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          diet_tags: string[]
          fat_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: string
          is_published: boolean | null
          kcal: number | null
          meal_type: string
          owner_id: string
          prep_time_minutes: number | null
          protein_g: number | null
          seasons: string[]
          servings: number | null
          title: string
          updated_at: string
        }
        Insert: {
          carbs_g?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          diet_tags?: string[]
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions: string
          is_published?: boolean | null
          kcal?: number | null
          meal_type: string
          owner_id: string
          prep_time_minutes?: number | null
          protein_g?: number | null
          seasons?: string[]
          servings?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          carbs_g?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          diet_tags?: string[]
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: string
          is_published?: boolean | null
          kcal?: number | null
          meal_type?: string
          owner_id?: string
          prep_time_minutes?: number | null
          protein_g?: number | null
          seasons?: string[]
          servings?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sleep_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          owner_id: string
          quality_score: number | null
          retention_until: string | null
          sleep_end: string | null
          sleep_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          owner_id: string
          quality_score?: number | null
          retention_until?: string | null
          sleep_end?: string | null
          sleep_start: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          owner_id?: string
          quality_score?: number | null
          retention_until?: string | null
          sleep_end?: string | null
          sleep_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          plan: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      symptom_catalog: {
        Row: {
          code: string
          description_nl: string | null
          domain: string
          is_active: boolean
          label_nl: string
        }
        Insert: {
          code: string
          description_nl?: string | null
          domain: string
          is_active?: boolean
          label_nl: string
        }
        Update: {
          code?: string
          description_nl?: string | null
          domain?: string
          is_active?: boolean
          label_nl?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          created_at: string
          day_id: string
          id: string
          owner_id: string
          retention_until: string | null
          severity_0_10: number
          symptom_code: string
          tags: Json
          timing: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          owner_id: string
          retention_until?: string | null
          severity_0_10: number
          symptom_code: string
          tags?: Json
          timing?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          owner_id?: string
          retention_until?: string | null
          severity_0_10?: number
          symptom_code?: string
          tags?: Json
          timing?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_day_id_owner_id_fkey"
            columns: ["day_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "diary_days"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "symptoms_day_id_owner_id_fkey"
            columns: ["day_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "v_daily_scores"
            referencedColumns: ["day_id", "owner_id"]
          },
          {
            foreignKeyName: "symptoms_symptom_code_fkey"
            columns: ["symptom_code"]
            isOneToOne: false
            referencedRelation: "symptom_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "symptoms_symptom_code_fkey"
            columns: ["symptom_code"]
            isOneToOne: false
            referencedRelation: "v_symptom_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      user_consents: {
        Row: {
          accepted_ai_processing: boolean | null
          accepted_at: string | null
          accepted_disclaimer: boolean
          accepted_health_data_processing: boolean
          accepted_privacy: boolean
          accepted_terms: boolean
          consent_version: string | null
          created_at: string
          id: string
          owner_id: string
          privacy_policy_version: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          accepted_ai_processing?: boolean | null
          accepted_at?: string | null
          accepted_disclaimer?: boolean
          accepted_health_data_processing?: boolean
          accepted_privacy?: boolean
          accepted_terms?: boolean
          consent_version?: string | null
          created_at?: string
          id?: string
          owner_id: string
          privacy_policy_version?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          accepted_ai_processing?: boolean | null
          accepted_at?: string | null
          accepted_disclaimer?: boolean
          accepted_health_data_processing?: boolean
          accepted_privacy?: boolean
          accepted_terms?: boolean
          consent_version?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          privacy_policy_version?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_community_comments: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          owner_id: string | null
          post_id: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          owner_id?: never
          post_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          owner_id?: never
          post_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "v_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_community_posts: {
        Row: {
          category: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          likes_count: number | null
          owner_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          likes_count?: number | null
          owner_id?: never
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          likes_count?: number | null
          owner_id?: never
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_daily_scores: {
        Row: {
          carbs_g: number | null
          day_date: string | null
          day_id: string | null
          day_score: number | null
          fiber_g: number | null
          kcal_total: number | null
          meals_count: number | null
          owner_id: string | null
          protein_g: number | null
          score_reasons: string[] | null
        }
        Relationships: []
      }
      v_symptom_catalog: {
        Row: {
          code: string | null
          description_nl: string | null
          domain: string | null
          label_nl: string | null
        }
        Insert: {
          code?: string | null
          description_nl?: string | null
          domain?: string | null
          label_nl?: string | null
        }
        Update: {
          code?: string | null
          description_nl?: string | null
          domain?: string | null
          label_nl?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_ai_limit: {
        Args: { monthly_limit?: number; user_id: string }
        Returns: boolean
      }
      cleanup_ai_cache: { Args: never; Returns: undefined }
      cleanup_expired_data: { Args: never; Returns: undefined }
      cleanup_old_data: { Args: never; Returns: undefined }
      delete_user_data: { Args: { user_uuid: string }; Returns: boolean }
      export_user_data: { Args: { user_uuid: string }; Returns: Json }
      export_user_data_complete: { Args: { user_uuid: string }; Returns: Json }
      get_ai_usage_remaining: {
        Args: { monthly_limit?: number; user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
