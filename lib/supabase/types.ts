// Hand-rolled type until `supabase gen types typescript` is run against
// the live project. Mirrors the schema in `supabase/migrations/*.sql`.
// Run `supabase gen types typescript --project-id <ref> > lib/supabase/types.ts`
// to replace this with the auto-generated version once the project exists.
//
// Important: shape matches what `supabase gen types` produces (explicit
// Insert/Update objects, Relationships arrays, empty Views/Functions/Enums/
// CompositeTypes maps). The `@supabase/supabase-js` generic relies on this
// exact structure — don't switch Insert/Update to Partial<Row>, the
// .insert() call typing breaks.

export type UserRole = "buyer" | "account_manager";
export type ChatSessionStatus = "ai" | "in_handoff" | "closed";
export type ChatSenderType = "user" | "ai" | "account_manager" | "system";
export type RfqStatus = "in_progress" | "submitted" | "won" | "lost";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface UsersRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionsRow {
  id: string;
  user_id: string;
  status: ChatSessionStatus;
  handoff_requested_at: string | null;
  assigned_am_user_id: string | null;
  title: string | null;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessagesRow {
  id: string;
  chat_session_id: string;
  sender_type: ChatSenderType;
  sender_user_id: string | null;
  content: string;
  translated_content: string | null;
  translated_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export interface RfqsRow {
  id: string;
  chat_session_id: string;
  user_id: string;
  full_name: string;
  company_name: string;
  business_email: string;
  phone_number: string;
  job_role: string;
  machine_type: string;
  intended_application: string;
  technical_specifications: Record<string, string>;
  quantity: string;
  delivery_country: string;
  delivery_city_or_port: string;
  purchase_timeline: string;
  budget_range: string;
  compliance_requirements: string[];
  new_or_used_preference: string;
  additional_notes: string;
  status: RfqStatus;
  is_complete: boolean;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UsersRow;
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: ChatSessionsRow;
        Insert: {
          id?: string;
          user_id: string;
          status?: ChatSessionStatus;
          handoff_requested_at?: string | null;
          assigned_am_user_id?: string | null;
          title?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: ChatSessionStatus;
          handoff_requested_at?: string | null;
          assigned_am_user_id?: string | null;
          title?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessagesRow;
        Insert: {
          id?: string;
          chat_session_id: string;
          sender_type: ChatSenderType;
          sender_user_id?: string | null;
          content: string;
          translated_content?: string | null;
          translated_to?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_session_id?: string;
          sender_type?: ChatSenderType;
          sender_user_id?: string | null;
          content?: string;
          translated_content?: string | null;
          translated_to?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      rfqs: {
        Row: RfqsRow;
        Insert: {
          id?: string;
          chat_session_id: string;
          user_id: string;
          full_name?: string;
          company_name?: string;
          business_email?: string;
          phone_number?: string;
          job_role?: string;
          machine_type?: string;
          intended_application?: string;
          technical_specifications?: Json;
          quantity?: string;
          delivery_country?: string;
          delivery_city_or_port?: string;
          purchase_timeline?: string;
          budget_range?: string;
          compliance_requirements?: string[];
          new_or_used_preference?: string;
          additional_notes?: string;
          status?: RfqStatus;
          hubspot_contact_id?: string | null;
          hubspot_deal_id?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chat_session_id?: string;
          user_id?: string;
          full_name?: string;
          company_name?: string;
          business_email?: string;
          phone_number?: string;
          job_role?: string;
          machine_type?: string;
          intended_application?: string;
          technical_specifications?: Json;
          quantity?: string;
          delivery_country?: string;
          delivery_city_or_port?: string;
          purchase_timeline?: string;
          budget_range?: string;
          compliance_requirements?: string[];
          new_or_used_preference?: string;
          additional_notes?: string;
          status?: RfqStatus;
          hubspot_contact_id?: string | null;
          hubspot_deal_id?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      // Atomic check-and-increment rate limiter. See migration
      // 0008_rate_limits.sql and lib/rateLimit.ts.
      check_rate_limit: {
        Args: {
          p_key: string;
          p_max: number;
          p_window_seconds: number;
        };
        Returns: {
          allowed: boolean;
          remaining: number;
          reset_at: string;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
