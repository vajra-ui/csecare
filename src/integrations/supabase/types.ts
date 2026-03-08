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
      academic_records: {
        Row: {
          cgpa: number | null
          created_at: string
          guidance_notes: string | null
          id: string
          semester: number
          student_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          cgpa?: number | null
          created_at?: string
          guidance_notes?: string | null
          id?: string
          semester: number
          student_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          cgpa?: number | null
          created_at?: string
          guidance_notes?: string | null
          id?: string
          semester?: number
          student_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_records_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          expiry_date: string
          id: string
          is_active: boolean | null
          priority: Database["public"]["Enums"]["announcement_priority"]
          start_date: string
          target_audience: Database["public"]["Enums"]["announcement_target"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          expiry_date: string
          id?: string
          is_active?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          start_date?: string
          target_audience?: Database["public"]["Enums"]["announcement_target"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          expiry_date?: string
          id?: string
          is_active?: boolean | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          start_date?: string
          target_audience?: Database["public"]["Enums"]["announcement_target"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_url: string
          grade: string | null
          id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_url: string
          grade?: string | null
          id?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_url?: string
          grade?: string | null
          id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          faculty_id: string
          id: string
          section: Database["public"]["Enums"]["section_type"]
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          faculty_id: string
          id?: string
          section: Database["public"]["Enums"]["section_type"]
          subject: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          faculty_id?: string
          id?: string
          section?: Database["public"]["Enums"]["section_type"]
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          faculty_id: string | null
          hour_number: number
          id: string
          is_present: boolean
          student_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          date: string
          faculty_id?: string | null
          hour_number: number
          id?: string
          is_present?: boolean
          student_id: string
          subject: string
        }
        Update: {
          created_at?: string
          date?: string
          faculty_id?: string | null
          hour_number?: number
          id?: string
          is_present?: boolean
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      class_notes: {
        Row: {
          created_at: string
          description: string | null
          faculty_id: string
          file_name: string
          file_url: string
          id: string
          section: Database["public"]["Enums"]["section_type"]
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          faculty_id: string
          file_name: string
          file_url: string
          id?: string
          section: Database["public"]["Enums"]["section_type"]
          subject: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          faculty_id?: string
          file_name?: string
          file_url?: string
          id?: string
          section?: Database["public"]["Enums"]["section_type"]
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_notes_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_timetable: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          exam_date: string
          exam_name: string
          id: string
          section: Database["public"]["Enums"]["section_type"]
          start_time: string
          subject: string
          venue: string | null
          year: Database["public"]["Enums"]["year_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          exam_date: string
          exam_name: string
          id?: string
          section: Database["public"]["Enums"]["section_type"]
          start_time: string
          subject: string
          venue?: string | null
          year: Database["public"]["Enums"]["year_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          exam_date?: string
          exam_name?: string
          id?: string
          section?: Database["public"]["Enums"]["section_type"]
          start_time?: string
          subject?: string
          venue?: string | null
          year?: Database["public"]["Enums"]["year_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exam_timetable_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          created_at: string
          current_subjects: string[] | null
          dob: string
          faculty_id: string
          id: string
          is_tutor: boolean | null
          name: string
          qualification: string | null
          section: Database["public"]["Enums"]["section_type"] | null
          updated_at: string
          user_id: string | null
          years_of_experience: number | null
        }
        Insert: {
          created_at?: string
          current_subjects?: string[] | null
          dob: string
          faculty_id: string
          id?: string
          is_tutor?: boolean | null
          name: string
          qualification?: string | null
          section?: Database["public"]["Enums"]["section_type"] | null
          updated_at?: string
          user_id?: string | null
          years_of_experience?: number | null
        }
        Update: {
          created_at?: string
          current_subjects?: string[] | null
          dob?: string
          faculty_id?: string
          id?: string
          is_tutor?: boolean | null
          name?: string
          qualification?: string | null
          section?: Database["public"]["Enums"]["section_type"] | null
          updated_at?: string
          user_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      faculty_feedback: {
        Row: {
          comments: string | null
          communication: number | null
          created_at: string
          faculty_id: string
          id: string
          punctuality: number | null
          rating: number
          section: Database["public"]["Enums"]["section_type"]
          semester: number
          subject: string
          teaching_quality: number | null
        }
        Insert: {
          comments?: string | null
          communication?: number | null
          created_at?: string
          faculty_id: string
          id?: string
          punctuality?: number | null
          rating: number
          section: Database["public"]["Enums"]["section_type"]
          semester: number
          subject: string
          teaching_quality?: number | null
        }
        Update: {
          comments?: string | null
          communication?: number | null
          created_at?: string
          faculty_id?: string
          id?: string
          punctuality?: number | null
          rating?: number
          section?: Database["public"]["Enums"]["section_type"]
          semester?: number
          subject?: string
          teaching_quality?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_feedback_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_leaves: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          faculty_id: string
          id: string
          leave_type: string
          reason: string
          remarks: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          faculty_id: string
          id?: string
          leave_type?: string
          reason: string
          remarks?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          faculty_id?: string
          id?: string
          leave_type?: string
          reason?: string
          remarks?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_leaves_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_leaves_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_sessions: {
        Row: {
          action_items: string | null
          created_at: string
          id: string
          next_session_date: string | null
          notes: string
          session_date: string
          session_type: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          action_items?: string | null
          created_at?: string
          id?: string
          next_session_date?: string | null
          notes: string
          session_date: string
          session_type?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          action_items?: string | null
          created_at?: string
          id?: string
          next_session_date?: string | null
          notes?: string
          session_date?: string
          session_type?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_sessions_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      od_requests: {
        Row: {
          admin_approved_at: string | null
          admin_remarks: string | null
          completed_at: string | null
          created_at: string
          end_date: string
          id: string
          letter_url: string | null
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["od_status"]
          student_id: string
          tutor_id: string | null
          tutor_remarks: string | null
          tutor_verified_at: string | null
          updated_at: string
        }
        Insert: {
          admin_approved_at?: string | null
          admin_remarks?: string | null
          completed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          letter_url?: string | null
          reason: string
          start_date: string
          status?: Database["public"]["Enums"]["od_status"]
          student_id: string
          tutor_id?: string | null
          tutor_remarks?: string | null
          tutor_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_approved_at?: string | null
          admin_remarks?: string | null
          completed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          letter_url?: string | null
          reason?: string
          start_date?: string
          status?: Database["public"]["Enums"]["od_status"]
          student_id?: string
          tutor_id?: string | null
          tutor_remarks?: string | null
          tutor_verified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "od_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "od_requests_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_communications: {
        Row: {
          communication_type: string
          created_at: string
          date: string
          follow_up_date: string | null
          follow_up_needed: boolean | null
          id: string
          parent_name: string | null
          parent_phone: string | null
          student_id: string
          summary: string
          tutor_id: string
        }
        Insert: {
          communication_type?: string
          created_at?: string
          date: string
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          student_id: string
          summary: string
          tutor_id: string
        }
        Update: {
          communication_type?: string
          created_at?: string
          date?: string
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          id?: string
          parent_name?: string | null
          parent_phone?: string | null
          student_id?: string
          summary?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_communications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_communications_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          category: string
          certificate_url: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          student_id: string
          title: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          category?: string
          certificate_url?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          student_id: string
          title: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          category?: string
          certificate_url?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          student_id?: string
          title?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          student_id: string
          subject: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          student_id: string
          subject?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          student_id?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          dob: string
          id: string
          name: string
          profile_photo_url: string | null
          register_number: string
          roll_number: string
          section: Database["public"]["Enums"]["section_type"]
          tutor_id: string | null
          updated_at: string
          user_id: string | null
          year: Database["public"]["Enums"]["year_type"]
        }
        Insert: {
          created_at?: string
          dob: string
          id?: string
          name: string
          profile_photo_url?: string | null
          register_number: string
          roll_number: string
          section: Database["public"]["Enums"]["section_type"]
          tutor_id?: string | null
          updated_at?: string
          user_id?: string | null
          year: Database["public"]["Enums"]["year_type"]
        }
        Update: {
          created_at?: string
          dob?: string
          id?: string
          name?: string
          profile_photo_url?: string | null
          register_number?: string
          roll_number?: string
          section?: Database["public"]["Enums"]["section_type"]
          tutor_id?: string | null
          updated_at?: string
          user_id?: string | null
          year?: Database["public"]["Enums"]["year_type"]
        }
        Relationships: [
          {
            foreignKeyName: "students_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_scores: {
        Row: {
          created_at: string
          external_marks: number | null
          grade: string | null
          id: string
          internal_marks: number | null
          semester: number
          student_id: string
          subject_name: string
          total_marks: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          external_marks?: number | null
          grade?: string | null
          id?: string
          internal_marks?: number | null
          semester: number
          student_id: string
          subject_name: string
          total_marks?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          external_marks?: number | null
          grade?: string | null
          id?: string
          internal_marks?: number | null
          semester?: number
          student_id?: string
          subject_name?: string
          total_marks?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_scores_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          created_at: string
          day_of_week: number
          faculty_id: string
          hour_number: number
          id: string
          section: Database["public"]["Enums"]["section_type"]
          subject: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          faculty_id: string
          hour_number: number
          id?: string
          section: Database["public"]["Enums"]["section_type"]
          subject: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          faculty_id?: string
          hour_number?: number
          id?: string
          section?: Database["public"]["Enums"]["section_type"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      generate_faculty_id: { Args: never; Returns: string }
      get_attendance_percentage: {
        Args: { _student_id: string }
        Returns: number
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_faculty: { Args: { _user_id: string }; Returns: boolean }
      is_tutor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      announcement_priority: "info" | "important" | "urgent"
      announcement_target: "all" | "faculty" | "students"
      app_role: "ADMIN" | "FACULTY" | "TUTOR" | "STUDENT"
      od_status:
        | "submitted"
        | "tutor_verified"
        | "admin_approved"
        | "completed"
        | "rejected"
      section_type: "CSE A" | "CSE B" | "CSE C" | "CSE D"
      year_type: "I" | "II" | "III" | "IV"
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
      announcement_priority: ["info", "important", "urgent"],
      announcement_target: ["all", "faculty", "students"],
      app_role: ["ADMIN", "FACULTY", "TUTOR", "STUDENT"],
      od_status: [
        "submitted",
        "tutor_verified",
        "admin_approved",
        "completed",
        "rejected",
      ],
      section_type: ["CSE A", "CSE B", "CSE C", "CSE D"],
      year_type: ["I", "II", "III", "IV"],
    },
  },
} as const
