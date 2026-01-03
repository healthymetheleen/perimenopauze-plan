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
          accepted_at: string | null
          accepted_disclaimer: boolean
          accepted_health_data_processing: boolean
          accepted_privacy: boolean
          accepted_terms: boolean
          created_at: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_disclaimer?: boolean
          accepted_health_data_processing?: boolean
          accepted_privacy?: boolean
          accepted_terms?: boolean
          created_at?: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_disclaimer?: boolean
          accepted_health_data_processing?: boolean
          accepted_privacy?: boolean
          accepted_terms?: boolean
          created_at?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_daily_scores: {
        Row: {
          day_date: string | null
          day_id: string | null
          day_score: number | null
          fiber_g: number | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
