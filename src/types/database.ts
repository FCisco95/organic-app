export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Custom type aliases for convenience
export type UserRole = Database['public']['Enums']['user_role'];
export type ProposalStatus = Database['public']['Enums']['proposal_status'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type SprintStatus = Database['public']['Enums']['sprint_status'];
export type VoteValue = Database['public']['Enums']['vote_value'];
export type TaskType = Database['public']['Enums']['task_type'];
export type ReviewStatus = Database['public']['Enums']['review_status'];
export type TaskPriority = Database['public']['Enums']['task_priority'];
export type ActivityEventType = Database['public']['Enums']['activity_event_type'];
export type ProposalResult = 'passed' | 'failed' | 'quorum_not_met';

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_id: string | null;
          created_at: string | null;
          event_type: Database['public']['Enums']['activity_event_type'];
          id: string;
          metadata: Json | null;
          subject_id: string;
          subject_type: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string | null;
          event_type: Database['public']['Enums']['activity_event_type'];
          id?: string;
          metadata?: Json | null;
          subject_id: string;
          subject_type: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string | null;
          event_type?: Database['public']['Enums']['activity_event_type'];
          id?: string;
          metadata?: Json | null;
          subject_id?: string;
          subject_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'leaderboard_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          attachments: Json | null;
          body: string;
          created_at: string | null;
          id: string;
          org_id: string | null;
          subject_id: string;
          subject_type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          attachments?: Json | null;
          body: string;
          created_at?: string | null;
          id?: string;
          org_id?: string | null;
          subject_id: string;
          subject_type: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          attachments?: Json | null;
          body?: string;
          created_at?: string | null;
          id?: string;
          org_id?: string | null;
          subject_id?: string;
          subject_type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'leaderboard_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      holder_snapshots: {
        Row: {
          balance_ui: number;
          created_at: string | null;
          id: string;
          org_id: string | null;
          proposal_id: string;
          taken_at: string | null;
          wallet_pubkey: string;
        };
        Insert: {
          balance_ui: number;
          created_at?: string | null;
          id?: string;
          org_id?: string | null;
          proposal_id: string;
          taken_at?: string | null;
          wallet_pubkey: string;
        };
        Update: {
          balance_ui?: number;
          created_at?: string | null;
          id?: string;
          org_id?: string | null;
          proposal_id?: string;
          taken_at?: string | null;
          wallet_pubkey?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'holder_snapshots_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'holder_snapshots_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      orgs: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          theme: Json | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          theme?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          theme?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          approval_threshold: number | null;
          body: string;
          closes_at: string | null;
          created_at: string | null;
          created_by: string;
          id: string;
          org_id: string | null;
          quorum_required: number | null;
          result: string | null;
          snapshot_taken_at: string | null;
          status: Database['public']['Enums']['proposal_status'] | null;
          title: string;
          total_circulating_supply: number | null;
          updated_at: string | null;
          voting_ends_at: string | null;
          voting_starts_at: string | null;
        };
        Insert: {
          approval_threshold?: number | null;
          body: string;
          closes_at?: string | null;
          created_at?: string | null;
          created_by: string;
          id?: string;
          org_id?: string | null;
          quorum_required?: number | null;
          result?: string | null;
          snapshot_taken_at?: string | null;
          status?: Database['public']['Enums']['proposal_status'] | null;
          title: string;
          total_circulating_supply?: number | null;
          updated_at?: string | null;
          voting_ends_at?: string | null;
          voting_starts_at?: string | null;
        };
        Update: {
          approval_threshold?: number | null;
          body?: string;
          closes_at?: string | null;
          created_at?: string | null;
          created_by?: string;
          id?: string;
          org_id?: string | null;
          quorum_required?: number | null;
          result?: string | null;
          snapshot_taken_at?: string | null;
          status?: Database['public']['Enums']['proposal_status'] | null;
          title?: string;
          total_circulating_supply?: number | null;
          updated_at?: string | null;
          voting_ends_at?: string | null;
          voting_starts_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'proposals_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'leaderboard_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposals_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'proposals_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      sprint_snapshots: {
        Row: {
          completed_at: string;
          completed_by: string | null;
          completed_points: number;
          completed_tasks: number;
          completion_rate: number;
          created_at: string | null;
          id: string;
          incomplete_action: string | null;
          incomplete_tasks: number;
          sprint_id: string;
          task_summary: Json;
          total_points: number;
          total_tasks: number;
        };
        Insert: {
          completed_at?: string;
          completed_by?: string | null;
          completed_points?: number;
          completed_tasks?: number;
          completion_rate?: number;
          created_at?: string | null;
          id?: string;
          incomplete_action?: string | null;
          incomplete_tasks?: number;
          sprint_id: string;
          task_summary?: Json;
          total_points?: number;
          total_tasks?: number;
        };
        Update: {
          completed_at?: string;
          completed_by?: string | null;
          completed_points?: number;
          completed_tasks?: number;
          completion_rate?: number;
          created_at?: string | null;
          id?: string;
          incomplete_action?: string | null;
          incomplete_tasks?: number;
          sprint_id?: string;
          task_summary?: Json;
          total_points?: number;
          total_tasks?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sprint_snapshots_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'leaderboard_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sprint_snapshots_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sprint_snapshots_sprint_id_fkey';
            columns: ['sprint_id'];
            isOneToOne: true;
            referencedRelation: 'sprints';
            referencedColumns: ['id'];
          },
        ];
      };
      sprints: {
        Row: {
          capacity_points: number | null;
          created_at: string | null;
          end_at: string;
          goal: string | null;
          id: string;
          name: string;
          org_id: string | null;
          start_at: string;
          status: Database['public']['Enums']['sprint_status'] | null;
          updated_at: string | null;
        };
        Insert: {
          capacity_points?: number | null;
          created_at?: string | null;
          end_at: string;
          goal?: string | null;
          id?: string;
          name: string;
          org_id?: string | null;
          start_at: string;
          status?: Database['public']['Enums']['sprint_status'] | null;
          updated_at?: string | null;
        };
        Update: {
          capacity_points?: number | null;
          created_at?: string | null;
          end_at?: string;
          goal?: string | null;
          id?: string;
          name?: string;
          org_id?: string | null;
          start_at?: string;
          status?: Database['public']['Enums']['sprint_status'] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sprints_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      task_assignees: {
        Row: {
          claimed_at: string | null;
          id: string;
          submission_id: string | null;
          task_id: string;
          user_id: string;
        };
        Insert: {
          claimed_at?: string | null;
          id?: string;
          submission_id?: string | null;
          task_id: string;
          user_id: string;
        };
        Update: {
          claimed_at?: string | null;
          id?: string;
          submission_id?: string | null;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_assignees_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'task_submissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_assignees_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_comments: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          task_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          task_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          task_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_likes: {
        Row: {
          created_at: string | null;
          task_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          task_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_likes_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_submissions: {
        Row: {
          content_link: string | null;
          content_text: string | null;
          created_at: string | null;
          custom_fields: Json | null;
          description: string | null;
          earned_points: number | null;
          file_urls: string[] | null;
          id: string;
          pr_link: string | null;
          quality_score: number | null;
          reach_metrics: Json | null;
          rejection_reason: string | null;
          review_status: Database['public']['Enums']['review_status'] | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          revision_notes: string | null;
          submission_type: Database['public']['Enums']['task_type'];
          submitted_at: string | null;
          task_id: string;
          testing_notes: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          content_link?: string | null;
          content_text?: string | null;
          created_at?: string | null;
          custom_fields?: Json | null;
          description?: string | null;
          earned_points?: number | null;
          file_urls?: string[] | null;
          id?: string;
          pr_link?: string | null;
          quality_score?: number | null;
          reach_metrics?: Json | null;
          rejection_reason?: string | null;
          review_status?: Database['public']['Enums']['review_status'] | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          revision_notes?: string | null;
          submission_type: Database['public']['Enums']['task_type'];
          submitted_at?: string | null;
          task_id: string;
          testing_notes?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          content_link?: string | null;
          content_text?: string | null;
          created_at?: string | null;
          custom_fields?: Json | null;
          description?: string | null;
          earned_points?: number | null;
          file_urls?: string[] | null;
          id?: string;
          pr_link?: string | null;
          quality_score?: number | null;
          reach_metrics?: Json | null;
          rejection_reason?: string | null;
          review_status?: Database['public']['Enums']['review_status'] | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          revision_notes?: string | null;
          submission_type?: Database['public']['Enums']['task_type'];
          submitted_at?: string | null;
          task_id?: string;
          testing_notes?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_submissions_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          base_points: number | null;
          claimed_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          is_team_task: boolean | null;
          labels: string[] | null;
          max_assignees: number | null;
          org_id: string | null;
          points: number | null;
          priority: Database['public']['Enums']['task_priority'] | null;
          proposal_id: string | null;
          sprint_id: string | null;
          status: Database['public']['Enums']['task_status'] | null;
          task_type: Database['public']['Enums']['task_type'] | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          assignee_id?: string | null;
          base_points?: number | null;
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_team_task?: boolean | null;
          labels?: string[] | null;
          max_assignees?: number | null;
          org_id?: string | null;
          points?: number | null;
          priority?: Database['public']['Enums']['task_priority'] | null;
          proposal_id?: string | null;
          sprint_id?: string | null;
          status?: Database['public']['Enums']['task_status'] | null;
          task_type?: Database['public']['Enums']['task_type'] | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          assignee_id?: string | null;
          base_points?: number | null;
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_team_task?: boolean | null;
          labels?: string[] | null;
          max_assignees?: number | null;
          org_id?: string | null;
          points?: number | null;
          priority?: Database['public']['Enums']['task_priority'] | null;
          proposal_id?: string | null;
          sprint_id?: string | null;
          status?: Database['public']['Enums']['task_status'] | null;
          task_type?: Database['public']['Enums']['task_type'] | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'leaderboard_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_sprint_id_fkey';
            columns: ['sprint_id'];
            isOneToOne: false;
            referencedRelation: 'sprints';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          discord: string | null;
          email: string;
          id: string;
          location: string | null;
          name: string | null;
          organic_id: number | null;
          role: Database['public']['Enums']['user_role'] | null;
          tasks_completed: number;
          total_points: number;
          twitter: string | null;
          updated_at: string | null;
          wallet_pubkey: string | null;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          discord?: string | null;
          email: string;
          id: string;
          location?: string | null;
          name?: string | null;
          organic_id?: number | null;
          role?: Database['public']['Enums']['user_role'] | null;
          tasks_completed?: number;
          total_points?: number;
          twitter?: string | null;
          updated_at?: string | null;
          wallet_pubkey?: string | null;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          discord?: string | null;
          email?: string;
          id?: string;
          location?: string | null;
          name?: string | null;
          organic_id?: number | null;
          role?: Database['public']['Enums']['user_role'] | null;
          tasks_completed?: number;
          total_points?: number;
          twitter?: string | null;
          updated_at?: string | null;
          wallet_pubkey?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string | null;
          id: string;
          org_id: string | null;
          proposal_id: string;
          value: Database['public']['Enums']['vote_value'];
          voter_id: string;
          weight: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          org_id?: string | null;
          proposal_id: string;
          value: Database['public']['Enums']['vote_value'];
          voter_id: string;
          weight?: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          org_id?: string | null;
          proposal_id?: string;
          value?: Database['public']['Enums']['vote_value'];
          voter_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'votes_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votes_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votes_voter_id_fkey';
            columns: ['voter_id'];
            isOneToOne: false;
            referencedRelation: 'leaderboard_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votes_voter_id_fkey';
            columns: ['voter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      voting_config: {
        Row: {
          abstain_counts_toward_quorum: boolean;
          approval_threshold: number;
          created_at: string | null;
          id: string;
          max_live_proposals: number;
          org_id: string | null;
          proposal_threshold_org: number;
          proposer_cooldown_days: number;
          quorum_percentage: number;
          updated_at: string | null;
          voting_duration_days: number;
        };
        Insert: {
          abstain_counts_toward_quorum?: boolean;
          approval_threshold?: number;
          created_at?: string | null;
          id?: string;
          max_live_proposals?: number;
          org_id?: string | null;
          proposal_threshold_org?: number;
          proposer_cooldown_days?: number;
          quorum_percentage?: number;
          updated_at?: string | null;
          voting_duration_days?: number;
        };
        Update: {
          abstain_counts_toward_quorum?: boolean;
          approval_threshold?: number;
          created_at?: string | null;
          id?: string;
          max_live_proposals?: number;
          org_id?: string | null;
          proposal_threshold_org?: number;
          proposer_cooldown_days?: number;
          quorum_percentage?: number;
          updated_at?: string | null;
          voting_duration_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'voting_config_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: true;
            referencedRelation: 'orgs';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_nonces: {
        Row: {
          created_at: string | null;
          expires_at: string;
          id: string;
          nonce: string;
          used_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at: string;
          id?: string;
          nonce: string;
          used_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          nonce?: string;
          used_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard_view: {
        Row: {
          avatar_url: string | null;
          dense_rank: number | null;
          email: string | null;
          id: string | null;
          name: string | null;
          organic_id: number | null;
          rank: number | null;
          role: Database['public']['Enums']['user_role'] | null;
          tasks_completed: number | null;
          total_points: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      calculate_quality_multiplier: { Args: { score: number }; Returns: number };
      calculate_vote_result: {
        Args: { p_proposal_id: string };
        Returns: string;
      };
      check_quorum_met: { Args: { p_proposal_id: string }; Returns: boolean };
      cleanup_expired_nonces: { Args: never; Returns: number };
      get_next_organic_id: { Args: never; Returns: number };
      get_user_voting_weight: {
        Args: { p_proposal_id: string; p_wallet_pubkey: string };
        Returns: number;
      };
      get_vote_tally: {
        Args: { p_proposal_id: string };
        Returns: {
          abstain_count: number;
          abstain_votes: number;
          no_count: number;
          no_votes: number;
          total_count: number;
          total_votes: number;
          yes_count: number;
          yes_votes: number;
        }[];
      };
    };
    Enums: {
      activity_event_type:
        | 'task_created'
        | 'task_status_changed'
        | 'task_completed'
        | 'task_deleted'
        | 'submission_created'
        | 'submission_reviewed'
        | 'comment_created'
        | 'comment_deleted'
        | 'proposal_created'
        | 'proposal_status_changed'
        | 'proposal_deleted'
        | 'vote_cast';
      proposal_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'voting';
      review_status: 'pending' | 'approved' | 'rejected' | 'disputed';
      sprint_status: 'planning' | 'active' | 'completed';
      task_priority: 'low' | 'medium' | 'high' | 'critical';
      task_status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
      task_type: 'development' | 'content' | 'design' | 'custom';
      user_role: 'admin' | 'council' | 'member' | 'guest';
      vote_value: 'yes' | 'no' | 'abstain';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_event_type: [
        'task_created',
        'task_status_changed',
        'task_completed',
        'task_deleted',
        'submission_created',
        'submission_reviewed',
        'comment_created',
        'comment_deleted',
        'proposal_created',
        'proposal_status_changed',
        'proposal_deleted',
        'vote_cast',
      ],
      proposal_status: ['draft', 'submitted', 'approved', 'rejected', 'voting'],
      review_status: ['pending', 'approved', 'rejected', 'disputed'],
      sprint_status: ['planning', 'active', 'completed'],
      task_priority: ['low', 'medium', 'high', 'critical'],
      task_status: ['backlog', 'todo', 'in_progress', 'review', 'done'],
      task_type: ['development', 'content', 'design', 'custom'],
      user_role: ['admin', 'council', 'member', 'guest'],
      vote_value: ['yes', 'no', 'abstain'],
    },
  },
} as const;
