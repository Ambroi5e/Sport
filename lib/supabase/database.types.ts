// Généré depuis le projet Supabase « sport » (generate_typescript_types). Ne pas modifier à la main.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      body_weights: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          note: string | null
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on: string
          note?: string | null
          updated_at?: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_primary: boolean
          target_date: string | null
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_primary?: boolean
          target_date?: string | null
          type: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_primary?: boolean
          target_date?: string | null
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string | null
          distance_unit: string
          height_cm: number | null
          level: Database["public"]["Enums"]["training_level"] | null
          locale: string
          onboarded_at: string | null
          sessions_per_week: number | null
          sex: Database["public"]["Enums"]["sex"] | null
          timezone: string
          updated_at: string
          user_id: string
          weight_unit: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          distance_unit?: string
          height_cm?: number | null
          level?: Database["public"]["Enums"]["training_level"] | null
          locale?: string
          onboarded_at?: string | null
          sessions_per_week?: number | null
          sex?: Database["public"]["Enums"]["sex"] | null
          timezone?: string
          updated_at?: string
          user_id: string
          weight_unit?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          distance_unit?: string
          height_cm?: number | null
          level?: Database["public"]["Enums"]["training_level"] | null
          locale?: string
          onboarded_at?: string | null
          sessions_per_week?: number | null
          sex?: Database["public"]["Enums"]["sex"] | null
          timezone?: string
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Relationships: []
      }
      user_modules: {
        Row: {
          enabled: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          enabled?: boolean
          module?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_stats: {
        Args: never
        Returns: {
          invitations_active: number
          invitations_used: number
          users: number
        }[]
      }
      create_invitation: {
        Args: { p_valid_days?: number }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      invitation_hash: { Args: { p_code: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_module:
        | "musculation"
        | "endurance"
        | "hyrox"
        | "sports"
        | "nutrition"
        | "courses"
        | "corps"
        | "complements"
        | "planning"
        | "amis"
      app_role: "admin"
      goal_type:
        | "prise_de_masse"
        | "seche"
        | "recomposition"
        | "force"
        | "hyrox"
        | "course_10k"
        | "semi_marathon"
        | "marathon"
        | "triathlon_s"
        | "triathlon_m"
        | "triathlon_70_3"
        | "triathlon_ironman"
        | "raquette"
        | "collectif"
        | "forme"
      sex: "homme" | "femme" | "autre"
      training_level: "debutant" | "intermediaire" | "avance"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      app_module: ["musculation", "endurance", "hyrox", "sports", "nutrition", "courses", "corps", "complements", "planning", "amis"],
      app_role: ["admin"],
      goal_type: [
        "prise_de_masse", "seche", "recomposition", "force", "hyrox", "course_10k", "semi_marathon", "marathon",
        "triathlon_s", "triathlon_m", "triathlon_70_3", "triathlon_ironman", "raquette", "collectif", "forme",
      ],
      sex: ["homme", "femme", "autre"],
      training_level: ["debutant", "intermediaire", "avance"],
    },
  },
} as const
