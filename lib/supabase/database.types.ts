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
      activities: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          intensity: Database["public"]["Enums"]["activity_intensity"]
          label: string | null
          performed_on: string
          sport: Database["public"]["Enums"]["activity_sport"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          intensity: Database["public"]["Enums"]["activity_intensity"]
          label?: string | null
          performed_on: string
          sport: Database["public"]["Enums"]["activity_sport"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          intensity?: Database["public"]["Enums"]["activity_intensity"]
          label?: string | null
          performed_on?: string
          sport?: Database["public"]["Enums"]["activity_sport"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_days: {
        Row: {
          blocked_on: string
          created_at: string
          user_id: string
        }
        Insert: {
          blocked_on: string
          created_at?: string
          user_id?: string
        }
        Update: {
          blocked_on?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          site: Database["public"]["Enums"]["body_site"]
          updated_at: string
          user_id: string
          value_cm: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on: string
          site: Database["public"]["Enums"]["body_site"]
          updated_at?: string
          user_id?: string
          value_cm: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          site?: Database["public"]["Enums"]["body_site"]
          updated_at?: string
          user_id?: string
          value_cm?: number
        }
        Relationships: []
      }
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
      daily_checkins: {
        Row: {
          checkin_on: string
          created_at: string
          energy: number
          sleep: number
          soreness: number
          stress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_on: string
          created_at?: string
          energy: number
          sleep: number
          soreness: number
          stress: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          checkin_on?: string
          created_at?: string
          energy?: number
          sleep?: number
          soreness?: number
          stress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_preferences: {
        Row: {
          created_at: string
          exercise_id: string
          preference: Database["public"]["Enums"]["exercise_preference"]
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          preference: Database["public"]["Enums"]["exercise_preference"]
          user_id?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          preference?: Database["public"]["Enums"]["exercise_preference"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_preferences_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
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
      food_logs: {
        Row: {
          created_at: string
          eaten_on: string
          food_id: string
          grams: number
          id: string
          meal: Database["public"]["Enums"]["meal"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eaten_on: string
          food_id: string
          grams: number
          id?: string
          meal: Database["public"]["Enums"]["meal"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          eaten_on?: string
          food_id?: string
          grams?: number
          id?: string
          meal?: Database["public"]["Enums"]["meal"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          archived_at: string | null
          barcode: string | null
          brand: string | null
          carbs_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          id: string
          is_recipe: boolean
          kcal: number
          name: string
          portion_g: number | null
          portion_label: string | null
          protein_g: number
          recipe_portions: number | null
          recipe_total_g: number | null
          salt_g: number | null
          slug: string | null
          sugar_g: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          barcode?: string | null
          brand?: string | null
          carbs_g: number
          created_at?: string
          fat_g: number
          fiber_g?: number | null
          id?: string
          is_recipe?: boolean
          kcal: number
          name: string
          portion_g?: number | null
          portion_label?: string | null
          protein_g: number
          recipe_portions?: number | null
          recipe_total_g?: number | null
          salt_g?: number | null
          slug?: string | null
          sugar_g?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          barcode?: string | null
          brand?: string | null
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          id?: string
          is_recipe?: boolean
          kcal?: number
          name?: string
          portion_g?: number | null
          portion_label?: string | null
          protein_g?: number
          recipe_portions?: number | null
          recipe_total_g?: number | null
          salt_g?: number | null
          slug?: string | null
          sugar_g?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      friend_invites: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          user_a?: string
          user_b?: string
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
      group_events: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_name: string
          id: string
          reps: number | null
          session_id: string
          set_id: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_name: string
          id?: string
          reps?: number | null
          session_id: string
          set_id: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_name?: string
          id?: string
          reps?: number | null
          session_id?: string
          set_id?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      group_participants: {
        Row: {
          created_at: string
          joined_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          joined_at?: string | null
          session_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          joined_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          name?: string
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
      nutrition_targets: {
        Row: {
          carbs_g: number | null
          day_type: Database["public"]["Enums"]["day_type"]
          fat_g: number | null
          kcal: number
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          day_type: Database["public"]["Enums"]["day_type"]
          fat_g?: number | null
          kcal: number
          protein_g: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          carbs_g?: number | null
          day_type?: Database["public"]["Enums"]["day_type"]
          fat_g?: number | null
          kcal?: number
          protein_g?: number
          updated_at?: string
          user_id?: string
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
          training_days: number[]
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
          training_days?: number[]
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
          training_days?: number[]
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          deload_every: number
          ended_on: string | null
          equipment: Database["public"]["Enums"]["equipment"][]
          goal_date: string | null
          goal_exercise_id: string | null
          goal_kg: number | null
          id: string
          name: string
          priority_muscles: Database["public"]["Enums"]["muscle"][]
          session_minutes: number
          sessions_per_week: number
          starts_on: string
          updated_at: string
          user_id: string
          weeks: number
        }
        Insert: {
          created_at?: string
          deload_every?: number
          ended_on?: string | null
          equipment: Database["public"]["Enums"]["equipment"][]
          goal_date?: string | null
          goal_exercise_id?: string | null
          goal_kg?: number | null
          id?: string
          name: string
          priority_muscles?: Database["public"]["Enums"]["muscle"][]
          session_minutes: number
          sessions_per_week: number
          starts_on: string
          updated_at?: string
          user_id?: string
          weeks?: number
        }
        Update: {
          created_at?: string
          deload_every?: number
          ended_on?: string | null
          equipment?: Database["public"]["Enums"]["equipment"][]
          goal_date?: string | null
          goal_exercise_id?: string | null
          goal_kg?: number | null
          id?: string
          name?: string
          priority_muscles?: Database["public"]["Enums"]["muscle"][]
          session_minutes?: number
          sessions_per_week?: number
          starts_on?: string
          updated_at?: string
          user_id?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "programs_goal_exercise_id_fkey"
            columns: ["goal_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          pose: Database["public"]["Enums"]["photo_pose"]
          storage_path: string
          taken_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pose: Database["public"]["Enums"]["photo_pose"]
          storage_path: string
          taken_on: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          pose?: Database["public"]["Enums"]["photo_pose"]
          storage_path?: string
          taken_on?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          created_at: string
          food_id: string
          grams: number
          id: string
          position: number
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          grams: number
          id?: string
          position?: number
          recipe_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          food_id?: string
          grams?: number
          id?: string
          position?: number
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_user_id_fkey"
            columns: ["recipe_id", "user_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      saved_meal_items: {
        Row: {
          created_at: string
          food_id: string
          grams: number
          id: string
          position: number
          saved_meal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          grams: number
          id?: string
          position?: number
          saved_meal_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          food_id?: string
          grams?: number
          id?: string
          position?: number
          saved_meal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_meal_items_saved_meal_id_user_id_fkey"
            columns: ["saved_meal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      saved_meals: {
        Row: {
          created_at: string
          id: string
          meal: Database["public"]["Enums"]["meal"]
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal: Database["public"]["Enums"]["meal"]
          name: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          meal?: Database["public"]["Enums"]["meal"]
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_pins: {
        Row: {
          created_at: string
          planned_on: string
          template_id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          planned_on: string
          template_id: string
          updated_at?: string
          user_id?: string
          week_start: string
        }
        Update: {
          created_at?: string
          planned_on?: string
          template_id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_pins_template_id_user_id_fkey"
            columns: ["template_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      share_grants: {
        Row: {
          category: Database["public"]["Enums"]["share_category"]
          created_at: string
          friend_id: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["share_category"]
          created_at?: string
          friend_id: string
          user_id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["share_category"]
          created_at?: string
          friend_id?: string
          user_id?: string
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
      weekly_sports: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          intensity: Database["public"]["Enums"]["activity_intensity"]
          label: string | null
          sport: Database["public"]["Enums"]["activity_sport"]
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          intensity: Database["public"]["Enums"]["activity_intensity"]
          label?: string | null
          sport: Database["public"]["Enums"]["activity_sport"]
          updated_at?: string
          user_id?: string
          weekday: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          intensity?: Database["public"]["Enums"]["activity_intensity"]
          label?: string | null
          sport?: Database["public"]["Enums"]["activity_sport"]
          updated_at?: string
          user_id?: string
          weekday?: number
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
          program_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          program_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          program_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_program_fkey"
            columns: ["program_id", "user_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          is_light: boolean
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
          is_light?: boolean
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
          is_light?: boolean
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
      accept_friend_invite: { Args: { p_code: string }; Returns: string }
      admin_stats: {
        Args: never
        Returns: {
          invitations_active: number
          invitations_used: number
          users: number
        }[]
      }
      can_view: {
        Args: {
          p_category: Database["public"]["Enums"]["share_category"]
          p_owner: string
        }
        Returns: boolean
      }
      create_friend_invite: {
        Args: never
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      create_invitation: {
        Args: { p_valid_days?: number }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      exercise_is_usable: { Args: { p_exercise_id: string }; Returns: boolean }
      food_is_usable: { Args: { p_food_id: string }; Returns: boolean }
      friend_activities: {
        Args: { p_owner: string }
        Returns: {
          duration_minutes: number
          intensity: string
          label: string
          performed_on: string
          sport: string
        }[]
      }
      friend_checkins: {
        Args: { p_owner: string }
        Returns: {
          checkin_on: string
          energy: number
          sleep: number
          soreness: number
          stress: number
        }[]
      }
      friend_measurements: {
        Args: { p_owner: string }
        Returns: {
          measured_on: string
          site: string
          value_cm: number
        }[]
      }
      friend_nutrition: {
        Args: { p_owner: string }
        Returns: {
          carbs_g: number
          eaten_on: string
          fat_g: number
          kcal: number
          protein_g: number
        }[]
      }
      friend_records: {
        Args: { p_owner: string }
        Returns: {
          e1rm_kg: number
          exercise_name: string
          performed_on: string
          reps: number
          weight_kg: number
        }[]
      }
      friend_weights: {
        Args: { p_owner: string }
        Returns: {
          measured_on: string
          weight_kg: number
        }[]
      }
      friend_workouts: {
        Args: { p_owner: string }
        Returns: {
          is_light: boolean
          minutes: number
          name: string
          performed_on: string
          sets: number
          volume_kg: number
        }[]
      }
      friends_overview: {
        Args: never
        Returns: {
          display_name: string
          friend_id: string
          shown_by_me: Database["public"]["Enums"]["share_category"][]
          shown_to_me: Database["public"]["Enums"]["share_category"][]
          since: string
        }[]
      }
      group_people: {
        Args: { p_session: string }
        Returns: {
          display_name: string
          is_owner: boolean
          joined_at: string
          user_id: string
        }[]
      }
      invitation_hash: { Args: { p_code: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_friend: { Args: { p_other: string }; Returns: boolean }
      is_group_member: { Args: { p_session: string }; Returns: boolean }
      is_group_participant: { Args: { p_session: string }; Returns: boolean }
      owns_group_session: { Args: { p_session: string }; Returns: boolean }
      reserve_invitation: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_intensity: "legere" | "moderee" | "intense"
      activity_sport:
        | "padel"
        | "tennis"
        | "squash"
        | "badminton"
        | "foot"
        | "basket"
        | "handball"
        | "rugby"
        | "volley"
        | "escalade"
        | "combat"
        | "autre"
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
      body_site:
        | "cou"
        | "epaules"
        | "poitrine"
        | "bras"
        | "avant_bras"
        | "taille"
        | "hanches"
        | "cuisse"
        | "mollet"
      day_type: "entrainement" | "repos"
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
      exercise_preference: "aime" | "evite"
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
      meal: "petit_dejeuner" | "dejeuner" | "collation" | "diner"
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
      photo_pose: "face" | "profil" | "dos"
      sex: "homme" | "femme" | "autre"
      share_category:
        | "seances"
        | "records"
        | "poids"
        | "mensurations"
        | "nutrition"
        | "forme"
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
      activity_intensity: ["legere", "moderee", "intense"],
      activity_sport: [
        "padel",
        "tennis",
        "squash",
        "badminton",
        "foot",
        "basket",
        "handball",
        "rugby",
        "volley",
        "escalade",
        "combat",
        "autre",
      ],
      app_module: ["musculation", "endurance", "hyrox", "sports", "nutrition", "courses", "corps", "complements", "planning", "amis"],
      app_role: ["admin"],
      body_site: ["cou", "epaules", "poitrine", "bras", "avant_bras", "taille", "hanches", "cuisse", "mollet"],
      day_type: ["entrainement", "repos"],
      equipment: ["barre", "halteres", "machine", "poulie", "poids_du_corps", "kettlebell", "elastique", "autre"],
      exercise_measure: ["charge", "poids_du_corps", "duree"],
      exercise_preference: ["aime", "evite"],
      goal_type: [
        "prise_de_masse", "seche", "recomposition", "force", "hyrox", "course_10k", "semi_marathon", "marathon",
        "triathlon_s", "triathlon_m", "triathlon_70_3", "triathlon_ironman", "raquette", "collectif", "forme",
      ],
      meal: ["petit_dejeuner", "dejeuner", "collation", "diner"],
      muscle: [
        "pectoraux", "dorsaux", "trapezes", "lombaires", "epaules_avant", "epaules_laterales", "epaules_arriere",
        "biceps", "triceps", "avant_bras", "abdominaux", "obliques", "quadriceps", "ischios", "fessiers", "adducteurs", "mollets",
      ],
      photo_pose: ["face", "profil", "dos"],
      sex: ["homme", "femme", "autre"],
      share_category: [
        "seances",
        "records",
        "poids",
        "mensurations",
        "nutrition",
        "forme",
      ],
      training_level: ["debutant", "intermediaire", "avance"],
    },
  },
} as const
