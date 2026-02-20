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
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          condition_field: string
          condition_threshold: number
          condition_type: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          xp_reward: number
        }
        Insert: {
          category: string
          condition_field: string
          condition_threshold: number
          condition_type: string
          created_at?: string
          description: string
          icon?: string
          id: string
          name: string
          xp_reward?: number
        }
        Update: {
          category?: string
          condition_field?: string
          condition_threshold?: number
          condition_type?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          metadata: Json | null
          subject_id: string
          subject_type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          subject_id: string
          subject_type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string | null
          id: string
          org_id: string | null
          proposal_version_id: string | null
          subject_id: string
          subject_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string | null
          id?: string
          org_id?: string | null
          proposal_version_id?: string | null
          subject_id: string
          subject_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string | null
          id?: string
          org_id?: string | null
          proposal_version_id?: string | null
          subject_id?: string
          subject_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_proposal_version_id_fkey"
            columns: ["proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_comments: {
        Row: {
          content: string
          created_at: string
          dispute_id: string
          id: string
          user_id: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          dispute_id: string
          id?: string
          user_id: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          dispute_id?: string
          id?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_comments_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence_events: {
        Row: {
          created_at: string
          dispute_id: string
          file_name: string
          file_size_bytes: number
          id: string
          is_late: boolean
          late_reason: string | null
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_name: string
          file_size_bytes: number
          id?: string
          is_late?: boolean
          late_reason?: string | null
          mime_type: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          is_late?: boolean
          late_reason?: string | null
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_events_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_events_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          appeal_deadline: string | null
          arbitrator_id: string | null
          created_at: string
          disputant_id: string
          evidence_files: string[]
          evidence_links: string[]
          evidence_text: string
          id: string
          mediation_deadline: string | null
          new_quality_score: number | null
          reason: Database["public"]["Enums"]["dispute_reason"]
          resolution: Database["public"]["Enums"]["dispute_resolution"] | null
          resolution_notes: string | null
          resolved_at: string | null
          response_deadline: string | null
          response_links: string[]
          response_submitted_at: string | null
          response_text: string | null
          reviewer_id: string
          sprint_id: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          submission_id: string
          task_id: string
          tier: Database["public"]["Enums"]["dispute_tier"]
          updated_at: string
          xp_refunded: boolean
          xp_stake: number
        }
        Insert: {
          appeal_deadline?: string | null
          arbitrator_id?: string | null
          created_at?: string
          disputant_id: string
          evidence_files?: string[]
          evidence_links?: string[]
          evidence_text: string
          id?: string
          mediation_deadline?: string | null
          new_quality_score?: number | null
          reason: Database["public"]["Enums"]["dispute_reason"]
          resolution?: Database["public"]["Enums"]["dispute_resolution"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          response_deadline?: string | null
          response_links?: string[]
          response_submitted_at?: string | null
          response_text?: string | null
          reviewer_id: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          submission_id: string
          task_id: string
          tier?: Database["public"]["Enums"]["dispute_tier"]
          updated_at?: string
          xp_refunded?: boolean
          xp_stake: number
        }
        Update: {
          appeal_deadline?: string | null
          arbitrator_id?: string | null
          created_at?: string
          disputant_id?: string
          evidence_files?: string[]
          evidence_links?: string[]
          evidence_text?: string
          id?: string
          mediation_deadline?: string | null
          new_quality_score?: number | null
          reason?: Database["public"]["Enums"]["dispute_reason"]
          resolution?: Database["public"]["Enums"]["dispute_resolution"] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          response_deadline?: string | null
          response_links?: string[]
          response_submitted_at?: string | null
          response_text?: string | null
          reviewer_id?: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          submission_id?: string
          task_id?: string
          tier?: Database["public"]["Enums"]["dispute_tier"]
          updated_at?: string
          xp_refunded?: boolean
          xp_stake?: number
        }
        Relationships: [
          {
            foreignKeyName: "disputes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "task_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_disputant_id_fkey"
            columns: ["disputant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_arbitrator_id_fkey"
            columns: ["arbitrator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holder_snapshots: {
        Row: {
          balance_ui: number
          created_at: string | null
          id: string
          org_id: string | null
          proposal_id: string
          taken_at: string | null
          wallet_pubkey: string
        }
        Insert: {
          balance_ui: number
          created_at?: string | null
          id?: string
          org_id?: string | null
          proposal_id: string
          taken_at?: string | null
          wallet_pubkey: string
        }
        Update: {
          balance_ui?: number
          created_at?: string | null
          id?: string
          org_id?: string | null
          proposal_id?: string
          taken_at?: string | null
          wallet_pubkey?: string
        }
        Relationships: [
          {
            foreignKeyName: "holder_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holder_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_batch_events: {
        Row: {
          actor_id: string | null
          batch_id: string
          created_at: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          metadata: Json | null
          subject_id: string
          subject_type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          batch_id: string
          created_at?: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          subject_id: string
          subject_type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          batch_id?: string
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          subject_id?: string
          subject_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_batch_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_batch_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_batch_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "notification_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_batch_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_batch_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_batches: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          count: number
          created_at: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          first_event_at: string
          id: string
          last_event_at: string
          subject_id: string
          subject_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          count?: number
          created_at?: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          first_event_at?: string
          id?: string
          last_event_at?: string
          subject_id: string
          subject_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          count?: number
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          first_event_at?: string
          id?: string
          last_event_at?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_snapshots: {
        Row: {
          error_count: number
          expires_at: string
          fetched_at: string
          key: string
          last_error: string | null
          payload: Json
          provider: string
          stale_until: string
          updated_at: string
        }
        Insert: {
          error_count?: number
          expires_at: string
          fetched_at: string
          key: string
          last_error?: string | null
          payload?: Json
          provider?: string
          stale_until: string
          updated_at?: string
        }
        Update: {
          error_count?: number
          expires_at?: string
          fetched_at?: string
          key?: string
          last_error?: string | null
          payload?: Json
          provider?: string
          stale_until?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string | null
          email: boolean | null
          id: string
          in_app: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string | null
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string | null
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          batch_id: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string | null
          dedupe_key: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          subject_id: string
          subject_type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          batch_id?: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string | null
          dedupe_key?: string | null
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          subject_id: string
          subject_type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          batch_id?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string | null
          dedupe_key?: string | null
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          subject_id?: string
          subject_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "notification_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string | null
          default_sprint_capacity: number
          default_sprint_duration_days: number
          description: string | null
          gamification_config: Json
          id: string
          logo_url: string | null
          name: string
          organic_id_threshold: number | null
          rewards_config: Json | null
          slug: string
          theme: Json | null
          token_decimals: number
          token_mint: string | null
          token_symbol: string
          token_total_supply: number
          treasury_allocations: Json
          treasury_wallet: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_sprint_capacity?: number
          default_sprint_duration_days?: number
          description?: string | null
          gamification_config?: Json
          id?: string
          logo_url?: string | null
          name: string
          organic_id_threshold?: number | null
          rewards_config?: Json | null
          slug: string
          theme?: Json | null
          token_decimals?: number
          token_mint?: string | null
          token_symbol?: string
          token_total_supply?: number
          treasury_allocations?: Json
          treasury_wallet?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_sprint_capacity?: number
          default_sprint_duration_days?: number
          description?: string | null
          gamification_config?: Json
          id?: string
          logo_url?: string | null
          name?: string
          organic_id_threshold?: number | null
          rewards_config?: Json | null
          slug?: string
          theme?: Json | null
          token_decimals?: number
          token_mint?: string | null
          token_symbol?: string
          token_total_supply?: number
          treasury_allocations?: Json
          treasury_wallet?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_stage_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["proposal_status"] | null
          id: string
          metadata: Json
          proposal_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["proposal_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["proposal_status"] | null
          id?: string
          metadata?: Json
          proposal_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["proposal_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["proposal_status"] | null
          id?: string
          metadata?: Json
          proposal_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["proposal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "proposal_stage_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_stage_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_stage_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          body: string
          budget: string | null
          category: Database["public"]["Enums"]["proposal_category"] | null
          created_at: string
          created_by: string
          id: string
          motivation: string | null
          proposal_id: string
          solution: string | null
          summary: string | null
          timeline: string | null
          title: string
          version_number: number
        }
        Insert: {
          body: string
          budget?: string | null
          category?: Database["public"]["Enums"]["proposal_category"] | null
          created_at?: string
          created_by: string
          id?: string
          motivation?: string | null
          proposal_id: string
          solution?: string | null
          summary?: string | null
          timeline?: string | null
          title: string
          version_number: number
        }
        Update: {
          body?: string
          budget?: string | null
          category?: Database["public"]["Enums"]["proposal_category"] | null
          created_at?: string
          created_by?: string
          id?: string
          motivation?: string | null
          proposal_id?: string
          solution?: string | null
          summary?: string | null
          timeline?: string | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_voter_snapshots: {
        Row: {
          created_at: string
          cycle_broken: boolean
          delegated_weight: number
          delegator_count: number
          id: string
          own_weight: number
          proposal_id: string
          taken_at: string
          total_weight: number
          voter_id: string
        }
        Insert: {
          created_at?: string
          cycle_broken?: boolean
          delegated_weight?: number
          delegator_count?: number
          id?: string
          own_weight?: number
          proposal_id: string
          taken_at?: string
          total_weight?: number
          voter_id: string
        }
        Update: {
          created_at?: string
          cycle_broken?: boolean
          delegated_weight?: number
          delegator_count?: number
          id?: string
          own_weight?: number
          proposal_id?: string
          taken_at?: string
          total_weight?: number
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_voter_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_voter_snapshots_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_voter_snapshots_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approval_threshold: number | null
          body: string
          budget: string | null
          category: Database["public"]["Enums"]["proposal_category"] | null
          closes_at: string | null
          created_at: string | null
          created_by: string
          current_version_id: string | null
          current_version_number: number
          finalization_attempts: number
          finalization_dedupe_key: string | null
          finalization_failure_reason: string | null
          finalization_frozen_at: string | null
          finalization_last_attempt_at: string | null
          finalized_at: string | null
          id: string
          motivation: string | null
          org_id: string | null
          qualification_locked_at: string | null
          qualification_override_expires_at: string | null
          qualification_override_reason: string | null
          quorum_required: number | null
          result: string | null
          server_voting_started_at: string | null
          search_vector: unknown
          snapshot_taken_at: string | null
          solution: string | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          summary: string | null
          timeline: string | null
          title: string
          total_circulating_supply: number | null
          upvotes_frozen_at: string | null
          updated_at: string | null
          voting_ends_at: string | null
          voting_starts_at: string | null
        }
        Insert: {
          approval_threshold?: number | null
          body: string
          budget?: string | null
          category?: Database["public"]["Enums"]["proposal_category"] | null
          closes_at?: string | null
          created_at?: string | null
          created_by: string
          current_version_id?: string | null
          current_version_number?: number
          finalization_attempts?: number
          finalization_dedupe_key?: string | null
          finalization_failure_reason?: string | null
          finalization_frozen_at?: string | null
          finalization_last_attempt_at?: string | null
          finalized_at?: string | null
          id?: string
          motivation?: string | null
          org_id?: string | null
          qualification_locked_at?: string | null
          qualification_override_expires_at?: string | null
          qualification_override_reason?: string | null
          quorum_required?: number | null
          result?: string | null
          server_voting_started_at?: string | null
          search_vector?: unknown
          snapshot_taken_at?: string | null
          solution?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          summary?: string | null
          timeline?: string | null
          title: string
          total_circulating_supply?: number | null
          upvotes_frozen_at?: string | null
          updated_at?: string | null
          voting_ends_at?: string | null
          voting_starts_at?: string | null
        }
        Update: {
          approval_threshold?: number | null
          body?: string
          budget?: string | null
          category?: Database["public"]["Enums"]["proposal_category"] | null
          closes_at?: string | null
          created_at?: string | null
          created_by?: string
          current_version_id?: string | null
          current_version_number?: number
          finalization_attempts?: number
          finalization_dedupe_key?: string | null
          finalization_failure_reason?: string | null
          finalization_frozen_at?: string | null
          finalization_last_attempt_at?: string | null
          finalized_at?: string | null
          id?: string
          motivation?: string | null
          org_id?: string | null
          qualification_locked_at?: string | null
          qualification_override_expires_at?: string | null
          qualification_override_reason?: string | null
          quorum_required?: number | null
          result?: string | null
          server_voting_started_at?: string | null
          search_vector?: unknown
          snapshot_taken_at?: string | null
          solution?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          summary?: string | null
          timeline?: string | null
          title?: string
          total_circulating_supply?: number | null
          upvotes_frozen_at?: string | null
          updated_at?: string | null
          voting_ends_at?: string | null
          voting_starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_task_instances: {
        Row: {
          generated_at: string | null
          id: string
          sprint_id: string | null
          task_id: string
          template_id: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          sprint_id?: string | null
          task_id: string
          template_id: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          sprint_id?: string | null
          task_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_task_instances_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_instances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_claims: {
        Row: {
          admin_note: string | null
          conversion_rate: number
          created_at: string
          id: string
          paid_at: string | null
          paid_tx_signature: string | null
          points_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["reward_claim_status"]
          token_amount: number
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          admin_note?: string | null
          conversion_rate: number
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_tx_signature?: string | null
          points_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["reward_claim_status"]
          token_amount: number
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          admin_note?: string | null
          conversion_rate?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_tx_signature?: string | null
          points_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["reward_claim_status"]
          token_amount?: number
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      reward_distributions: {
        Row: {
          category: string | null
          claim_id: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          integrity_hold: boolean
          integrity_reason: string | null
          points_earned: number | null
          reason: string | null
          sprint_id: string | null
          token_amount: number
          type: Database["public"]["Enums"]["distribution_type"]
          user_id: string
        }
        Insert: {
          category?: string | null
          claim_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          integrity_hold?: boolean
          integrity_reason?: string | null
          points_earned?: number | null
          reason?: string | null
          sprint_id?: string | null
          token_amount: number
          type: Database["public"]["Enums"]["distribution_type"]
          user_id: string
        }
        Update: {
          category?: string | null
          claim_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          integrity_hold?: boolean
          integrity_reason?: string | null
          points_earned?: number | null
          reason?: string | null
          sprint_id?: string | null
          token_amount?: number
          type?: Database["public"]["Enums"]["distribution_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_distributions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "reward_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_distributions_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_settlement_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          org_id: string | null
          reason: string
          sprint_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          org_id?: string | null
          reason: string
          sprint_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          org_id?: string | null
          reason?: string
          sprint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_settlement_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_settlement_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_settlement_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_settlement_events_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_snapshots: {
        Row: {
          completed_at: string
          completed_by: string | null
          completed_points: number
          completed_tasks: number
          completion_rate: number
          created_at: string | null
          id: string
          incomplete_action: string | null
          incomplete_tasks: number
          sprint_id: string
          task_summary: Json
          total_points: number
          total_tasks: number
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          completed_points?: number
          completed_tasks?: number
          completion_rate?: number
          created_at?: string | null
          id?: string
          incomplete_action?: string | null
          incomplete_tasks?: number
          sprint_id: string
          task_summary?: Json
          total_points?: number
          total_tasks?: number
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          completed_points?: number
          completed_tasks?: number
          completion_rate?: number
          created_at?: string | null
          id?: string
          incomplete_action?: string | null
          incomplete_tasks?: number
          sprint_id?: string
          task_summary?: Json
          total_points?: number
          total_tasks?: number
        }
        Relationships: [
          {
            foreignKeyName: "sprint_snapshots_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_snapshots_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_snapshots_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: true
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          active_started_at: string | null
          capacity_points: number | null
          completed_at: string | null
          created_at: string | null
          dispute_window_ends_at: string | null
          dispute_window_started_at: string | null
          end_at: string
          goal: string | null
          id: string
          name: string
          org_id: string | null
          review_started_at: string | null
          reward_carryover_amount: number
          reward_carryover_sprint_count: number
          reward_emission_cap: number
          reward_settlement_committed_at: string | null
          reward_settlement_idempotency_key: string | null
          reward_settlement_kill_switch_at: string | null
          reward_settlement_status: string
          reward_pool: number | null
          settlement_blocked_reason: string | null
          settlement_integrity_flags: Json
          settlement_started_at: string | null
          start_at: string
          status: Database["public"]["Enums"]["sprint_status"] | null
          updated_at: string | null
        }
        Insert: {
          active_started_at?: string | null
          capacity_points?: number | null
          completed_at?: string | null
          created_at?: string | null
          dispute_window_ends_at?: string | null
          dispute_window_started_at?: string | null
          end_at: string
          goal?: string | null
          id?: string
          name: string
          org_id?: string | null
          review_started_at?: string | null
          reward_carryover_amount?: number
          reward_carryover_sprint_count?: number
          reward_emission_cap?: number
          reward_settlement_committed_at?: string | null
          reward_settlement_idempotency_key?: string | null
          reward_settlement_kill_switch_at?: string | null
          reward_settlement_status?: string
          reward_pool?: number | null
          settlement_blocked_reason?: string | null
          settlement_integrity_flags?: Json
          settlement_started_at?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["sprint_status"] | null
          updated_at?: string | null
        }
        Update: {
          active_started_at?: string | null
          capacity_points?: number | null
          completed_at?: string | null
          created_at?: string | null
          dispute_window_ends_at?: string | null
          dispute_window_started_at?: string | null
          end_at?: string
          goal?: string | null
          id?: string
          name?: string
          org_id?: string | null
          review_started_at?: string | null
          reward_carryover_amount?: number
          reward_carryover_sprint_count?: number
          reward_emission_cap?: number
          reward_settlement_committed_at?: string | null
          reward_settlement_idempotency_key?: string | null
          reward_settlement_kill_switch_at?: string | null
          reward_settlement_status?: string
          reward_pool?: number | null
          settlement_blocked_reason?: string | null
          settlement_integrity_flags?: Json
          settlement_started_at?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["sprint_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          claimed_at: string | null
          id: string
          submission_id: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          submission_id?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          id?: string
          submission_id?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "task_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_likes: {
        Row: {
          created_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_likes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          content_link: string | null
          content_text: string | null
          created_at: string | null
          custom_fields: Json | null
          description: string | null
          earned_points: number | null
          file_urls: string[] | null
          id: string
          pr_link: string | null
          quality_score: number | null
          reach_metrics: Json | null
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          revision_notes: string | null
          submission_type: Database["public"]["Enums"]["task_type"]
          submitted_at: string | null
          task_id: string
          testing_notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_link?: string | null
          content_text?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          earned_points?: number | null
          file_urls?: string[] | null
          id?: string
          pr_link?: string | null
          quality_score?: number | null
          reach_metrics?: Json | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          revision_notes?: string | null
          submission_type: Database["public"]["Enums"]["task_type"]
          submitted_at?: string | null
          task_id: string
          testing_notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_link?: string | null
          content_text?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          earned_points?: number | null
          file_urls?: string[] | null
          id?: string
          pr_link?: string | null
          quality_score?: number | null
          reach_metrics?: Json | null
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          revision_notes?: string | null
          submission_type?: Database["public"]["Enums"]["task_type"]
          submitted_at?: string | null
          task_id?: string
          testing_notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          base_points: number | null
          created_at: string | null
          created_by: string
          default_assignee_id: string | null
          description: string | null
          id: string
          is_recurring: boolean | null
          is_team_task: boolean | null
          labels: string[] | null
          max_assignees: number | null
          name: string
          org_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          recurrence_rule: Database["public"]["Enums"]["recurrence_rule"] | null
          task_type: Database["public"]["Enums"]["task_type"] | null
          updated_at: string | null
        }
        Insert: {
          base_points?: number | null
          created_at?: string | null
          created_by: string
          default_assignee_id?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          is_team_task?: boolean | null
          labels?: string[] | null
          max_assignees?: number | null
          name: string
          org_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence_rule?:
            | Database["public"]["Enums"]["recurrence_rule"]
            | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string | null
        }
        Update: {
          base_points?: number | null
          created_at?: string | null
          created_by?: string
          default_assignee_id?: string | null
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          is_team_task?: boolean | null
          labels?: string[] | null
          max_assignees?: number | null
          name?: string
          org_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence_rule?:
            | Database["public"]["Enums"]["recurrence_rule"]
            | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          base_points: number | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_team_task: boolean | null
          labels: string[] | null
          max_assignees: number | null
          org_id: string | null
          parent_task_id: string | null
          points: number | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          proposal_id: string | null
          proposal_version_id: string | null
          search_vector: unknown
          sprint_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_type: Database["public"]["Enums"]["task_type"] | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          base_points?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_team_task?: boolean | null
          labels?: string[] | null
          max_assignees?: number | null
          org_id?: string | null
          parent_task_id?: string | null
          points?: number | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          proposal_id?: string | null
          proposal_version_id?: string | null
          search_vector?: unknown
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          base_points?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_team_task?: boolean | null
          labels?: string[] | null
          max_assignees?: number | null
          org_id?: string | null
          parent_task_id?: string | null
          points?: number | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          proposal_id?: string | null
          proposal_version_id?: string | null
          search_vector?: unknown
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_proposal_provenance_fkey"
            columns: ["proposal_id", "proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["proposal_id", "id"]
          },
          {
            foreignKeyName: "tasks_proposal_version_id_fkey"
            columns: ["proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_accounts: {
        Row: {
          access_token_encrypted: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          profile_image_url: string | null
          refresh_token_encrypted: string | null
          scope: string[]
          token_expires_at: string | null
          twitter_user_id: string
          twitter_username: string
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          profile_image_url?: string | null
          refresh_token_encrypted?: string | null
          scope?: string[]
          token_expires_at?: string | null
          twitter_user_id: string
          twitter_username: string
          updated_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          profile_image_url?: string | null
          refresh_token_encrypted?: string | null
          scope?: string[]
          token_expires_at?: string | null
          twitter_user_id?: string
          twitter_username?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitter_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twitter_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_engagement_submissions: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          api_response: Json | null
          comment_text: string | null
          created_at: string
          engagement_type: Database["public"]["Enums"]["twitter_engagement_type"]
          id: string
          screenshot_url: string | null
          submission_id: string
          target_tweet_id: string
          twitter_account_id: string | null
          updated_at: string
          verification_method: Database["public"]["Enums"]["twitter_verification_method"]
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          api_response?: Json | null
          comment_text?: string | null
          created_at?: string
          engagement_type: Database["public"]["Enums"]["twitter_engagement_type"]
          id?: string
          screenshot_url?: string | null
          submission_id: string
          target_tweet_id: string
          twitter_account_id?: string | null
          updated_at?: string
          verification_method?: Database["public"]["Enums"]["twitter_verification_method"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          api_response?: Json | null
          comment_text?: string | null
          created_at?: string
          engagement_type?: Database["public"]["Enums"]["twitter_engagement_type"]
          id?: string
          screenshot_url?: string | null
          submission_id?: string
          target_tweet_id?: string
          twitter_account_id?: string | null
          updated_at?: string
          verification_method?: Database["public"]["Enums"]["twitter_verification_method"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twitter_engagement_submissions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "task_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twitter_engagement_submissions_twitter_account_id_fkey"
            columns: ["twitter_account_id"]
            isOneToOne: false
            referencedRelation: "twitter_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twitter_engagement_submissions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twitter_engagement_submissions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_engagement_tasks: {
        Row: {
          auto_approve: boolean
          auto_verify: boolean
          created_at: string
          engagement_type: Database["public"]["Enums"]["twitter_engagement_type"]
          id: string
          instructions: string | null
          requires_ai_review: boolean
          target_tweet_id: string
          target_tweet_url: string
          task_id: string
          updated_at: string
          verification_window_hours: number
        }
        Insert: {
          auto_approve?: boolean
          auto_verify?: boolean
          created_at?: string
          engagement_type: Database["public"]["Enums"]["twitter_engagement_type"]
          id?: string
          instructions?: string | null
          requires_ai_review?: boolean
          target_tweet_id: string
          target_tweet_url: string
          task_id: string
          updated_at?: string
          verification_window_hours?: number
        }
        Update: {
          auto_approve?: boolean
          auto_verify?: boolean
          created_at?: string
          engagement_type?: Database["public"]["Enums"]["twitter_engagement_type"]
          id?: string
          instructions?: string | null
          requires_ai_review?: boolean
          target_tweet_id?: string
          target_tweet_url?: string
          task_id?: string
          updated_at?: string
          verification_window_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "twitter_engagement_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_oauth_sessions: {
        Row: {
          code_verifier: string
          created_at: string
          expires_at: string
          id: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          expires_at: string
          id?: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          expires_at?: string
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitter_oauth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twitter_oauth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_counts: {
        Row: {
          comments_created: number
          proposals_created: number
          tasks_completed: number
          updated_at: string
          user_id: string
          votes_cast: number
        }
        Insert: {
          comments_created?: number
          proposals_created?: number
          tasks_completed?: number
          updated_at?: string
          user_id: string
          votes_cast?: number
        }
        Update: {
          comments_created?: number
          proposals_created?: number
          tasks_completed?: number
          updated_at?: string
          user_id?: string
          votes_cast?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_counts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_counts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          id: string
          subject_id: string
          subject_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subject_id: string
          subject_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subject_id?: string
          subject_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          claimable_points: number
          created_at: string | null
          current_streak: number
          discord: string | null
          email: string
          id: string
          last_active_date: string | null
          level: number
          location: string | null
          longest_streak: number
          name: string | null
          organic_id: number | null
          profile_visible: boolean
          role: Database["public"]["Enums"]["user_role"] | null
          tasks_completed: number
          total_points: number
          twitter: string | null
          twitter_verified: boolean
          updated_at: string | null
          wallet_pubkey: string | null
          website: string | null
          xp_total: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          claimable_points?: number
          created_at?: string | null
          current_streak?: number
          discord?: string | null
          email: string
          id: string
          last_active_date?: string | null
          level?: number
          location?: string | null
          longest_streak?: number
          name?: string | null
          organic_id?: number | null
          profile_visible?: boolean
          role?: Database["public"]["Enums"]["user_role"] | null
          tasks_completed?: number
          total_points?: number
          twitter?: string | null
          twitter_verified?: boolean
          updated_at?: string | null
          wallet_pubkey?: string | null
          website?: string | null
          xp_total?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          claimable_points?: number
          created_at?: string | null
          current_streak?: number
          discord?: string | null
          email?: string
          id?: string
          last_active_date?: string | null
          level?: number
          location?: string | null
          longest_streak?: number
          name?: string | null
          organic_id?: number | null
          profile_visible?: boolean
          role?: Database["public"]["Enums"]["user_role"] | null
          tasks_completed?: number
          total_points?: number
          twitter?: string | null
          twitter_verified?: boolean
          updated_at?: string | null
          wallet_pubkey?: string | null
          website?: string | null
          xp_total?: number
        }
        Relationships: []
      }
      vote_delegations: {
        Row: {
          category: Database["public"]["Enums"]["proposal_category"] | null
          created_at: string | null
          delegate_id: string
          delegator_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["proposal_category"] | null
          created_at?: string | null
          delegate_id: string
          delegator_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["proposal_category"] | null
          created_at?: string | null
          delegate_id?: string
          delegator_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          org_id: string | null
          proposal_id: string
          value: Database["public"]["Enums"]["vote_value"]
          voter_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          proposal_id: string
          value: Database["public"]["Enums"]["vote_value"]
          voter_id: string
          weight?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          proposal_id?: string
          value?: Database["public"]["Enums"]["vote_value"]
          voter_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_config: {
        Row: {
          abstain_counts_toward_quorum: boolean
          approval_threshold: number
          created_at: string | null
          id: string
          max_live_proposals: number
          org_id: string | null
          proposal_threshold_org: number
          proposer_cooldown_days: number
          quorum_percentage: number
          updated_at: string | null
          voting_duration_days: number
        }
        Insert: {
          abstain_counts_toward_quorum?: boolean
          approval_threshold?: number
          created_at?: string | null
          id?: string
          max_live_proposals?: number
          org_id?: string | null
          proposal_threshold_org?: number
          proposer_cooldown_days?: number
          quorum_percentage?: number
          updated_at?: string | null
          voting_duration_days?: number
        }
        Update: {
          abstain_counts_toward_quorum?: boolean
          approval_threshold?: number
          created_at?: string | null
          id?: string
          max_live_proposals?: number
          org_id?: string | null
          proposal_threshold_org?: number
          proposer_cooldown_days?: number
          quorum_percentage?: number
          updated_at?: string | null
          voting_duration_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "voting_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_nonces: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          nonce: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          nonce: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          nonce?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          source_id: string | null
          source_type: string | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_materialized: {
        Row: {
          avatar_url: string | null
          claimable_points: number | null
          current_streak: number | null
          dense_rank: number | null
          email: string | null
          id: string | null
          level: number | null
          name: string | null
          organic_id: number | null
          rank: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          tasks_completed: number | null
          total_points: number | null
          xp_total: number | null
        }
        Relationships: []
      }
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          claimable_points: number | null
          current_streak: number | null
          dense_rank: number | null
          email: string | null
          id: string | null
          level: number | null
          name: string | null
          organic_id: number | null
          rank: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          tasks_completed: number | null
          total_points: number | null
          xp_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_level_from_xp: { Args: { xp: number }; Returns: number }
      calculate_quality_multiplier: { Args: { score: number }; Returns: number }
      calculate_vote_result: {
        Args: { p_proposal_id: string }
        Returns: string
      }
      check_achievements: {
        Args: { p_user_id: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          icon: string
          xp_reward: number
        }[]
      }
      check_quorum_met: { Args: { p_proposal_id: string }; Returns: boolean }
      auto_escalate_sprint_disputes: {
        Args: { p_sprint_id: string }
        Returns: {
          admin_extended_count: number
          escalated_count: number
        }[]
      }
      apply_sprint_reviewer_sla: {
        Args: { p_extension_hours?: number; p_sprint_id: string }
        Returns: {
          admin_notified_count: number
          escalated_count: number
          extended_count: number
        }[]
      }
      commit_sprint_reward_settlement: {
        Args: {
          p_actor_id?: string
          p_reason?: string
          p_sprint_id: string
        }
        Returns: Json
      }
      sweep_overdue_dispute_reviewer_sla: {
        Args: { p_extension_hours?: number }
        Returns: {
          admin_notified_count: number
          escalated_count: number
          extended_count: number
        }[]
      }
      cleanup_expired_nonces: { Args: never; Returns: number }
      clone_recurring_templates: {
        Args: { p_sprint_id: string }
        Returns: number
      }
      distribute_epoch_rewards: {
        Args: { p_sprint_id: string }
        Returns: number
      }
      expire_proposal_override_promotions: { Args: never; Returns: number }
      finalize_proposal_voting_integrity: {
        Args: {
          p_dedupe_key?: string
          p_force?: boolean
          p_proposal_id: string
          p_test_fail_mode?: string
        }
        Returns: Json
      }
      get_activity_trends: {
        Args: { days?: number }
        Returns: {
          comment_events: number
          day: string
          governance_events: number
          task_events: number
        }[]
      }
      get_arbitrator_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_blocked_tasks: {
        Args: { p_task_id: string }
        Returns: {
          blocked_task_id: string
          blocked_task_status: string
          blocked_task_title: string
        }[]
      }
      get_blocking_tasks: {
        Args: { p_task_id: string }
        Returns: {
          blocking_task_id: string
          blocking_task_status: string
          blocking_task_title: string
        }[]
      }
      get_comment_counts: {
        Args: { p_subject_ids: string[]; p_subject_type: string }
        Returns: {
          count: number
          subject_id: string
        }[]
      }
      get_comment_counts_for_type: {
        Args: { p_subject_type: string }
        Returns: {
          count: number
          subject_id: string
        }[]
      }
      get_effective_voting_power: {
        Args: {
          p_proposal_category?: Database["public"]["Enums"]["proposal_category"]
          p_proposal_id: string
          p_user_id: string
        }
        Returns: number
      }
      get_member_growth: {
        Args: { months?: number }
        Returns: {
          cumulative_members: number
          month: string
          new_members: number
        }[]
      }
      get_next_organic_id: { Args: never; Returns: number }
      get_notification_category: {
        Args: { evt: Database["public"]["Enums"]["activity_event_type"] }
        Returns: Database["public"]["Enums"]["notification_category"]
      }
      get_proposal_vote_tally: {
        Args: { p_proposal_id: string }
        Returns: {
          abstain_count: number
          abstain_votes: number
          no_count: number
          no_votes: number
          total_count: number
          total_votes: number
          yes_count: number
          yes_votes: number
        }[]
      }
      get_proposals_by_category: {
        Args: never
        Returns: {
          category: string
          count: number
        }[]
      }
      get_rewards_summary: { Args: never; Returns: Json }
      resolve_proposal_snapshot_delegate: {
        Args: {
          p_proposal_category: Database["public"]["Enums"]["proposal_category"]
          p_source_user_id: string
        }
        Returns: {
          cycle_broken: boolean
          resolved_voter_id: string
        }[]
      }
      get_sprint_stats: {
        Args: { p_sprint_ids: string[] }
        Returns: {
          completed: number
          in_progress: number
          points: number
          sprint_id: string
          total: number
          total_points: number
        }[]
      }
      get_sprint_settlement_blockers: {
        Args: { p_sprint_id: string }
        Returns: Json
      }
      get_subtask_progress: {
        Args: { p_parent_task_id: string }
        Returns: {
          completed_subtasks: number
          progress_percentage: number
          total_subtasks: number
        }[]
      }
      get_task_completions: {
        Args: { weeks?: number }
        Returns: {
          completed_count: number
          total_points: number
          week: string
        }[]
      }
      get_user_voting_weight: {
        Args: { p_proposal_id: string; p_wallet_pubkey: string }
        Returns: number
      }
      get_vote_tally: {
        Args: { p_proposal_id: string }
        Returns: {
          abstain_count: number
          abstain_votes: number
          no_count: number
          no_votes: number
          total_count: number
          total_votes: number
          yes_count: number
          yes_votes: number
        }[]
      }
      start_proposal_voting_integrity: {
        Args: {
          p_proposal_id: string
          p_snapshot_holders?: Json
          p_voting_duration_days?: number
        }
        Returns: Json
      }
      get_voting_participation: {
        Args: { result_limit?: number }
        Returns: {
          abstain_votes: number
          no_votes: number
          proposal_id: string
          proposal_title: string
          vote_count: number
          yes_votes: number
        }[]
      }
      is_task_blocked: { Args: { p_task_id: string }; Returns: boolean }
      resolve_follow_target: {
        Args: { p_metadata: Json; p_subject_id: string; p_subject_type: string }
        Returns: {
          target_id: string
          target_type: string
        }[]
      }
    }
    Enums: {
      activity_event_type:
        | "task_created"
        | "task_status_changed"
        | "task_completed"
        | "task_deleted"
        | "submission_created"
        | "submission_reviewed"
        | "comment_created"
        | "comment_deleted"
        | "proposal_created"
        | "proposal_status_changed"
        | "proposal_deleted"
        | "vote_cast"
        | "voting_reminder_24h"
        | "voting_reminder_1h"
        | "dispute_created"
        | "dispute_response_submitted"
        | "dispute_escalated"
        | "dispute_resolved"
        | "dispute_withdrawn"
      dispute_reason:
        | "rejected_unfairly"
        | "low_quality_score"
        | "plagiarism_claim"
        | "reviewer_bias"
        | "other"
      dispute_resolution:
        | "overturned"
        | "upheld"
        | "compromise"
        | "dismissed"
      dispute_status:
        | "open"
        | "mediation"
        | "awaiting_response"
        | "under_review"
        | "resolved"
        | "appealed"
        | "appeal_review"
        | "dismissed"
        | "withdrawn"
        | "mediated"
      dispute_tier: "mediation" | "council" | "admin"
      distribution_type: "epoch" | "manual" | "claim"
      notification_category:
        | "tasks"
        | "proposals"
        | "voting"
        | "comments"
        | "disputes"
        | "system"
      proposal_category:
        | "feature"
        | "governance"
        | "treasury"
        | "community"
        | "development"
      proposal_status:
        | "draft"
        | "public"
        | "qualified"
        | "discussion"
        | "submitted"
        | "finalized"
        | "canceled"
        | "approved"
        | "rejected"
        | "voting"
      recurrence_rule:
        | "sprint_start"
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
      review_status: "pending" | "approved" | "rejected" | "disputed"
      reward_claim_status: "pending" | "approved" | "rejected" | "paid"
      sprint_status:
        | "planning"
        | "active"
        | "review"
        | "dispute_window"
        | "settlement"
        | "completed"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "backlog" | "todo" | "in_progress" | "review" | "done"
      task_type: "development" | "content" | "design" | "custom" | "twitter"
      twitter_engagement_type: "like" | "retweet" | "comment"
      twitter_verification_method: "api_auto" | "screenshot" | "manual" | "ai_scored"
      user_role: "admin" | "council" | "member" | "guest"
      vote_value: "yes" | "no" | "abstain"
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
      activity_event_type: [
        "task_created",
        "task_status_changed",
        "task_completed",
        "task_deleted",
        "submission_created",
        "submission_reviewed",
        "comment_created",
        "comment_deleted",
        "proposal_created",
        "proposal_status_changed",
        "proposal_deleted",
        "vote_cast",
        "voting_reminder_24h",
        "voting_reminder_1h",
        "dispute_created",
        "dispute_response_submitted",
        "dispute_escalated",
        "dispute_resolved",
        "dispute_withdrawn",
      ],
      dispute_reason: [
        "rejected_unfairly",
        "low_quality_score",
        "plagiarism_claim",
        "reviewer_bias",
        "other",
      ],
      dispute_resolution: ["overturned", "upheld", "compromise", "dismissed"],
      dispute_status: [
        "open",
        "mediation",
        "awaiting_response",
        "under_review",
        "resolved",
        "appealed",
        "appeal_review",
        "dismissed",
        "withdrawn",
        "mediated",
      ],
      dispute_tier: ["mediation", "council", "admin"],
      distribution_type: ["epoch", "manual", "claim"],
      notification_category: [
        "tasks",
        "proposals",
        "voting",
        "comments",
        "disputes",
        "system",
      ],
      proposal_category: [
        "feature",
        "governance",
        "treasury",
        "community",
        "development",
      ],
      proposal_status: [
        "draft",
        "public",
        "qualified",
        "discussion",
        "submitted",
        "finalized",
        "canceled",
        "approved",
        "rejected",
        "voting",
      ],
      recurrence_rule: [
        "sprint_start",
        "daily",
        "weekly",
        "biweekly",
        "monthly",
      ],
      review_status: ["pending", "approved", "rejected", "disputed"],
      reward_claim_status: ["pending", "approved", "rejected", "paid"],
      sprint_status: [
        "planning",
        "active",
        "review",
        "dispute_window",
        "settlement",
        "completed",
      ],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["backlog", "todo", "in_progress", "review", "done"],
      task_type: ["development", "content", "design", "custom", "twitter"],
      twitter_engagement_type: ["like", "retweet", "comment"],
      twitter_verification_method: ["api_auto", "screenshot", "manual", "ai_scored"],
      user_role: ["admin", "council", "member", "guest"],
      vote_value: ["yes", "no", "abstain"],
    },
  },
} as const

// Re-export convenience type aliases used across the codebase
export type UserRole = Database["public"]["Enums"]["user_role"]
export type SprintStatus = Database["public"]["Enums"]["sprint_status"]
export type VoteValue = Database["public"]["Enums"]["vote_value"]
export type ProposalStatus = Database["public"]["Enums"]["proposal_status"]
export type ProposalCategory = Database["public"]["Enums"]["proposal_category"]
export type TaskType = Database["public"]["Enums"]["task_type"]
export type TaskStatus = Database["public"]["Enums"]["task_status"]
export type TaskPriority = Database["public"]["Enums"]["task_priority"]
export type ReviewStatus = Database["public"]["Enums"]["review_status"]
export type ProposalResult = "passed" | "failed" | "quorum_not_met"
