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
      exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          equipment: Database["public"]["Enums"]["equipment"]
          id: string
          measure: Database["public"]["Enums"]["exercise_measure"]
          name: string
          primary_muscles: Database["public"]["Enums"]["muscle"][]
          secondary_muscles: Database["public"]["Enums"]["muscle"][]
          slug: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          equipment?: Database["public"]["Enums"]["equipment"]
          id?: string
          measure?: Database["public"]["Enums"]["exercise_measure"]
          name: string
          primary_muscles: Database["public"]["Enums"]["muscle"][]
          secondary_muscles?: Database["public"]["Enums"]["muscle"][]
          slug?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          equipment?: Database["public"]["Enums"]["equipment"]
          id?: string
          measure?: Database["public"]["Enums"]["exercise_measure"]
          name?: string
          primary_muscles?: Database["public"]["Enums"]["muscle"][]
          secondary_muscles?: Database["public"]["Enums"]["muscle"][]
          slug?: string | null
          updated_at?: string
          user_id?: string | null
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
          reserved_email: string | null
          reserved_until: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          reserved_email?: string | null
          reserved_until?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          reserved_email?: string | null
          reserved_until?: string | null
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
      template_items: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          position: number
          rep_max: number | null
          rep_min: number | null
          rest_seconds: number | null
          sets: number
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          position?: number
          rep_max?: number | null
          rep_min?: number | null
          rest_seconds?: number | null
          sets?: number
          template_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          rep_max?: number | null
          rep_min?: number | null
          rest_seconds?: number | null
          sets?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_items_template_id_user_id_fkey"
            columns: ["template_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id", "user_id"]
          },
        ]
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
      workout_sets: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          exercise_id: string
          exercise_order: number
          id: string
          is_warmup: boolean
          rep_max: number | null
          rep_min: number | null
          reps: number | null
          set_number: number
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_id: string
          exercise_order?: number
          id?: string
          is_warmup?: boolean
          rep_max?: number | null
          rep_min?: number | null
          reps?: number | null
          set_number: number
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string
          exercise_order?: number
          id?: string
          is_warmup?: boolean
          rep_max?: number | null
          rep_min?: number | null
          reps?: number | null
          set_number?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_user_id_fkey"
            columns: ["workout_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          name: string
          notes: string | null
          performed_on: string
          started_at: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          name: string
          notes?: string | null
          performed_on: string
          started_at?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          performed_on?: string
          started_at?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
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
      exercise_is_usable: { Args: { p_exercise_id: string }; Returns: boolean }
      invitation_hash: { Args: { p_code: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      reserve_invitation: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
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
      equipment:
        | "barre"
        | "halteres"
        | "machine"
        | "poulie"
        | "poids_du_corps"
        | "kettlebell"
        | "elastique"
        | "autre"
      exercise_measure: "charge" | "poids_du_corps" | "duree"
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
      muscle:
        | "pectoraux"
        | "dorsaux"
        | "trapezes"
        | "lombaires"
        | "epaules_avant"
        | "epaules_laterales"
        | "epaules_arriere"
        | "biceps"
        | "triceps"
        | "avant_bras"
        | "abdominaux"
        | "obliques"
        | "quadriceps"
        | "ischios"
        | "fessiers"
        | "adducteurs"
        | "mollets"
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
      equipment: ["barre", "halteres", "machine", "poulie", "poids_du_corps", "kettlebell", "elastique", "autre"],
      exercise_measure: ["charge", "poids_du_corps", "duree"],
      goal_type: [
        "prise_de_masse", "seche", "recomposition", "force", "hyrox", "course_10k", "semi_marathon", "marathon",
        "triathlon_s", "triathlon_m", "triathlon_70_3", "triathlon_ironman", "raquette", "collectif", "forme",
      ],
      muscle: [
        "pectoraux", "dorsaux", "trapezes", "lombaires", "epaules_avant", "epaules_laterales", "epaules_arriere",
        "biceps", "triceps", "avant_bras", "abdominaux", "obliques", "quadriceps", "ischios", "fessiers", "adducteurs", "mollets",
      ],
      sex: ["homme", "femme", "autre"],
      training_level: ["debutant", "intermediaire", "avance"],
    },
  },
} as const
