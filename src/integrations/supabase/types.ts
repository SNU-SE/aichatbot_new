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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          content: Json
          created_at: string
          file_url: string | null
          final_question: string | null
          id: string
          enable_peer_evaluation: boolean
          is_hidden: boolean
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
          enable_peer_evaluation?: boolean
          is_hidden?: boolean
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
          enable_peer_evaluation?: boolean
          is_hidden?: boolean
          modules_count?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_class_assignments: {
        Row: {
          activity_id: string
          class_name: string
          created_at: string
          id: string
        }
        Insert: {
          activity_id: string
          class_name: string
          created_at?: string
          id?: string
        }
        Update: {
          activity_id?: string
          class_name?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_class_assignments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_documents: {
        Row: {
          activity_id: string
          created_at: string
          document_id: string
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          document_id: string
          processing_error?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          document_id?: string
          processing_error?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          id: string
          rag_enabled: boolean | null
          selected_model: string | null
          selected_provider: string | null
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          rag_enabled?: boolean | null
          selected_model?: string | null
          selected_provider?: string | null
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
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
          final_revised_argument: string | null
          final_revision_submitted_at: string | null
          id: string
          is_submitted: boolean | null
          response_text: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          activity_id: string
          final_revised_argument?: string | null
          final_revision_submitted_at?: string | null
          id?: string
          is_submitted?: boolean | null
          response_text: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          activity_id?: string
          final_revised_argument?: string | null
          final_revision_submitted_at?: string | null
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
      checklist_completion_history: {
        Row: {
          activity_id: string
          activity_title: string
          checklist_item_id: string
          completed_at: string
          created_at: string
          description: string
          id: string
          reset_at: string | null
          student_id: string
        }
        Insert: {
          activity_id: string
          activity_title: string
          checklist_item_id: string
          completed_at: string
          created_at?: string
          description: string
          id?: string
          reset_at?: string | null
          student_id: string
        }
        Update: {
          activity_id?: string
          activity_title?: string
          checklist_item_id?: string
          completed_at?: string
          created_at?: string
          description?: string
          id?: string
          reset_at?: string | null
          student_id?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          activity_id: string
          created_at: string
          description: string
          description_en: string | null
          description_ja: string | null
          description_ko: string | null
          description_zh: string | null
          id: string
          module_id: string | null
          step_number: number
        }
        Insert: {
          activity_id: string
          created_at?: string
          description: string
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          id?: string
          module_id?: string | null
          step_number: number
        }
        Update: {
          activity_id?: string
          created_at?: string
          description?: string
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
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
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          page_number: number | null
          position_end: number | null
          position_start: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          page_number?: number | null
          position_end?: number | null
          position_start?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          page_number?: number | null
          position_end?: number | null
          position_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_permissions: {
        Row: {
          activity_ids: string[] | null
          class_id: string | null
          created_at: string | null
          document_id: string | null
          granted_by: string | null
          id: string
          managed_by_activity: boolean | null
          permission_level:
            | Database["public"]["Enums"]["access_level_enum"]
            | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_ids?: string[] | null
          class_id?: string | null
          created_at?: string | null
          document_id?: string | null
          granted_by?: string | null
          id?: string
          managed_by_activity?: boolean | null
          permission_level?:
            | Database["public"]["Enums"]["access_level_enum"]
            | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_ids?: string[] | null
          class_id?: string | null
          created_at?: string | null
          document_id?: string | null
          granted_by?: string | null
          id?: string
          managed_by_activity?: boolean | null
          permission_level?:
            | Database["public"]["Enums"]["access_level_enum"]
            | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_path: string
          file_size: number
          filename: string
          folder_id: string | null
          id: string
          language: string | null
          metadata: Json | null
          mime_type: string
          processed_at: string | null
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_path: string
          file_size: number
          filename: string
          folder_id?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          mime_type?: string
          processed_at?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          folder_id?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          mime_type?: string
          processed_at?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_chat_logs: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          document_references: Json | null
          id: string
          message: string
          processing_time_ms: number | null
          role: Database["public"]["Enums"]["message_role_enum"]
          session_id: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          document_references?: Json | null
          id?: string
          message: string
          processing_time_ms?: number | null
          role: Database["public"]["Enums"]["message_role_enum"]
          session_id: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          document_references?: Json | null
          id?: string
          message?: string
          processing_time_ms?: number | null
          role?: Database["public"]["Enums"]["message_role_enum"]
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
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
      peer_evaluation_phases: {
        Row: {
          activity_id: string
          class_name: string
          created_at: string
          id: string
          phase: string
          teacher_completed_at: string | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          class_name: string
          created_at?: string
          id?: string
          phase?: string
          teacher_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          class_name?: string
          created_at?: string
          id?: string
          phase?: string
          teacher_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      peer_evaluations: {
        Row: {
          activity_id: string
          created_at: string
          evaluation_text: string | null
          evaluator_id: string
          id: string
          is_completed: boolean | null
          locked_at: string | null
          return_reason: string | null
          returned_at: string | null
          status: 'pending' | 'submitted' | 'returned'
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
          locked_at?: string | null
          return_reason?: string | null
          returned_at?: string | null
          status?: 'pending' | 'submitted' | 'returned'
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
          locked_at?: string | null
          return_reason?: string | null
          returned_at?: string | null
          status?: 'pending' | 'submitted' | 'returned'
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
      question_frequency: {
        Row: {
          activity_id: string
          count: number
          created_at: string
          id: string
          last_asked: string
          question_hash: string
          question_text: string
          student_id: string
        }
        Insert: {
          activity_id: string
          count?: number
          created_at?: string
          id?: string
          last_asked?: string
          question_hash: string
          question_text: string
          student_id: string
        }
        Update: {
          activity_id?: string
          count?: number
          created_at?: string
          id?: string
          last_asked?: string
          question_hash?: string
          question_text?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_frequency_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
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
      student_notes: {
        Row: {
          activity_id: string
          created_at: string | null
          id: string
          notes: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
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
            isOneToOne: true
            referencedRelation: "student_activity_view"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_work_drafts: {
        Row: {
          activity_id: string
          created_at: string | null
          draft_content: Json
          id: string
          student_id: string
          updated_at: string | null
          work_type: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          draft_content: Json
          id?: string
          student_id: string
          updated_at?: string | null
          work_type: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          draft_content?: Json
          id?: string
          student_id?: string
          updated_at?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_work_drafts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_name: string
          created_at: string
          group_name: string | null
          id: string
          mother_tongue: string | null
          name: string | null
          student_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_name: string
          created_at?: string
          group_name?: string | null
          id?: string
          mother_tongue?: string | null
          name?: string | null
          student_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_name?: string
          created_at?: string
          group_name?: string | null
          id?: string
          mother_tongue?: string | null
          name?: string | null
          student_id?: string
          updated_at?: string
          user_id?: string | null
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
      activity_document_details: {
        Row: {
          activity_id: string | null
          created_at: string | null
          document_id: string | null
          document_processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          file_path: string | null
          file_size: number | null
          filename: string | null
          metadata: Json | null
          mime_type: string | null
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Args:
          | { activity_id_param: string }
          | { activity_id_param: string; evaluations_per_student?: number }
        Returns: number
      }
      assign_peer_evaluations_by_class: {
        Args: {
          activity_id_param: string
          evaluations_per_student?: number
          target_class?: string
        }
        Returns: number
      }
      assign_peer_evaluations_specific: {
        Args: {
          activity_id_param: string
          evaluations_per_student?: number
          group_offset?: number
        }
        Returns: number
      }
      assign_peer_evaluations_specific_by_class: {
        Args: {
          activity_id_param: string
          evaluations_per_student?: number
          group_offset?: number
          target_class?: string
        }
        Returns: number
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_expired_sessions_with_logging: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_count: number
          session_ids: string[]
        }[]
      }
      cleanup_inactive_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_activity_with_related_data: {
        Args: { activity_id_param: string }
        Returns: Json
      }
      get_activity_related_data_count: {
        Args: { activity_id_param: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_peer_evaluation_stats: {
        Args: { activity_id_param: string }
        Returns: {
          completed_evaluations: number
          completion_rate: number
          submitted_responses: number
          total_evaluations: number
          total_responses: number
        }[]
      }
      get_peer_evaluation_stats_by_class: {
        Args: { activity_id_param: string }
        Returns: {
          class_name: string
          completed_evaluations: number
          completion_rate: number
          submitted_responses: number
          total_evaluations: number
          total_responses: number
        }[]
      }
      get_student_evaluation_status: {
        Args: { activity_id_param: string; student_id_param: string }
        Returns: {
          assigned_evaluations: number
          completed_evaluations: number
          has_submitted_response: boolean
          received_evaluations: number
        }[]
      }
      get_user_accessible_documents: {
        Args: { target_user_id: string }
        Returns: string[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_peer_evaluation_completed: {
        Args: { activity_id_param: string; class_name_param: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      rebuild_document_permissions_for_document: {
        Args: { p_document_id: string; p_granted_by?: string }
        Returns: Json
      }
      remove_activity_document: {
        Args: { p_activity_id: string; p_document_id: string }
        Returns: Json
      }
      search_documents_with_vector: {
        Args: {
          max_results?: number
          query_embedding: string
          similarity_threshold?: number
          user_accessible_docs?: string[]
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          document_title: string
          page_number: number
          similarity: number
        }[]
      }
      search_similar_chunks: {
        Args: {
          activity_id_param: string
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          chunk_index: number
          chunk_text: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      sync_activity_document_permissions: {
        Args: { p_activity_id: string; p_granted_by?: string }
        Returns: Json
      }
      update_document_processing_status: {
        Args: {
          doc_id: string
          new_status: Database["public"]["Enums"]["processing_status_enum"]
          processing_metadata?: Json
        }
        Returns: undefined
      }
      update_peer_evaluation_phase: {
        Args: {
          activity_id_param: string
          class_name_param: string
          new_phase: string
        }
        Returns: undefined
      }
      update_student_session: {
        Args: { student_id_param: string }
        Returns: undefined
      }
      upsert_activity_document_link: {
        Args: {
          p_activity_id: string
          p_document_id: string
          p_processing_error?: string
          p_processing_status?: Database["public"]["Enums"]["processing_status_enum"]
        }
        Returns: {
          activity_id: string
          created_at: string
          document_id: string
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          updated_at: string
        }
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      access_level_enum: "read" | "write" | "admin"
      app_role: "admin" | "student"
      message_role_enum: "user" | "assistant" | "system"
      processing_status_enum:
        | "uploading"
        | "extracting"
        | "chunking"
        | "embedding"
        | "completed"
        | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_level_enum: ["read", "write", "admin"],
      app_role: ["admin", "student"],
      message_role_enum: ["user", "assistant", "system"],
      processing_status_enum: [
        "uploading",
        "extracting",
        "chunking",
        "embedding",
        "completed",
        "failed",
      ],
    },
  },
} as const
