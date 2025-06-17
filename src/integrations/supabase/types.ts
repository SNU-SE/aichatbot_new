export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          content: Json
          created_at: string
          file_url: string | null
          final_question: string | null
          id: string
          modules_count: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          file_url?: string | null
          final_question?: string | null
          id?: string
          modules_count?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          file_url?: string | null
          final_question?: string | null
          id?: string
          modules_count?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_modules: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          module_number: number
          title: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          module_number: number
          title: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          module_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_modules_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          anthropic_api_key: string | null
          created_at: string
          id: string
          openai_api_key: string | null
          rag_enabled: boolean | null
          selected_model: string | null
          selected_provider: string | null
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          anthropic_api_key?: string | null
          created_at?: string
          id?: string
          openai_api_key?: string | null
          rag_enabled?: boolean | null
          selected_model?: string | null
          selected_provider?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          anthropic_api_key?: string | null
          created_at?: string
          id?: string
          openai_api_key?: string | null
          rag_enabled?: boolean | null
          selected_model?: string | null
          selected_provider?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      argumentation_responses: {
        Row: {
          activity_id: string
          id: string
          is_submitted: boolean | null
          response_text: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          activity_id: string
          id?: string
          is_submitted?: boolean | null
          response_text: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          activity_id?: string
          id?: string
          is_submitted?: boolean | null
          response_text?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "argumentation_responses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "argumentation_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "argumentation_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          activity_id: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message: string
          sender: string
          student_id: string
          timestamp: string
        }
        Insert: {
          activity_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message: string
          sender: string
          student_id: string
          timestamp?: string
        }
        Update: {
          activity_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string
          sender?: string
          student_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "chat_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          activity_id: string
          created_at: string
          description: string
          id: string
          module_id: string | null
          step_number: number
        }
        Insert: {
          activity_id: string
          created_at?: string
          description: string
          id?: string
          module_id?: string | null
          step_number: number
        }
        Update: {
          activity_id?: string
          created_at?: string
          description?: string
          id?: string
          module_id?: string | null
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "activity_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      class_prompt_settings: {
        Row: {
          active_prompt_id: string | null
          class_name: string
          created_at: string
          id: string
          rag_enabled: boolean | null
          selected_model: string | null
          selected_provider: string | null
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          active_prompt_id?: string | null
          class_name: string
          created_at?: string
          id?: string
          rag_enabled?: boolean | null
          selected_model?: string | null
          selected_provider?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          active_prompt_id?: string | null
          class_name?: string
          created_at?: string
          id?: string
          rag_enabled?: boolean | null
          selected_model?: string | null
          selected_provider?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_prompt_settings_active_prompt_id_fkey"
            columns: ["active_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_reflections: {
        Row: {
          activity_id: string
          id: string
          reflection_text: string
          student_id: string
          submitted_at: string
          usefulness_rating: number | null
        }
        Insert: {
          activity_id: string
          id?: string
          reflection_text: string
          student_id: string
          submitted_at?: string
          usefulness_rating?: number | null
        }
        Update: {
          activity_id?: string
          id?: string
          reflection_text?: string
          student_id?: string
          submitted_at?: string
          usefulness_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_reflections_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_reflections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "evaluation_reflections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      peer_evaluations: {
        Row: {
          activity_id: string
          created_at: string
          evaluation_text: string | null
          evaluator_id: string
          id: string
          is_completed: boolean | null
          submitted_at: string | null
          target_response_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          evaluation_text?: string | null
          evaluator_id: string
          id?: string
          is_completed?: boolean | null
          submitted_at?: string | null
          target_response_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          evaluation_text?: string | null
          evaluator_id?: string
          id?: string
          is_completed?: boolean | null
          submitted_at?: string | null
          target_response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_evaluations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "peer_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "peer_evaluations_target_response_id_fkey"
            columns: ["target_response_id"]
            isOneToOne: false
            referencedRelation: "argumentation_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          prompt: string
          target_class: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          prompt: string
          target_class?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          prompt?: string
          target_class?: string | null
        }
        Relationships: []
      }
      student_checklist_progress: {
        Row: {
          checklist_item_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          student_id: string
        }
        Insert: {
          checklist_item_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          student_id: string
        }
        Update: {
          checklist_item_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_checklist_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_checklist_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          created_at: string
          id: string
          is_online: boolean | null
          last_active: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean | null
          last_active?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean | null
          last_active?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students: {
        Row: {
          class_name: string
          created_at: string
          id: string
          mother_tongue: string | null
          name: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          class_name: string
          created_at?: string
          id?: string
          mother_tongue?: string | null
          name?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          id?: string
          mother_tongue?: string | null
          name?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      student_activity_view: {
        Row: {
          activities_participated: number | null
          class_name: string | null
          is_online: boolean | null
          last_active: string | null
          last_message_time: string | null
          name: string | null
          student_id: string | null
          total_messages: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_peer_evaluations: {
        Args: { activity_id_param: string }
        Returns: number
      }
      get_peer_evaluation_stats: {
        Args: { activity_id_param: string }
        Returns: {
          total_responses: number
          submitted_responses: number
          total_evaluations: number
          completed_evaluations: number
          completion_rate: number
        }[]
      }
      get_student_evaluation_status: {
        Args: { student_id_param: string; activity_id_param: string }
        Returns: {
          has_submitted_response: boolean
          assigned_evaluations: number
          completed_evaluations: number
          received_evaluations: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
