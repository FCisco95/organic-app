export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'council' | 'member' | 'guest';
export type ProposalStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'voting';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type SprintStatus = 'planning' | 'active' | 'completed';
export type VoteValue = 'yes' | 'no' | 'abstain';
export type TaskType = 'development' | 'content' | 'design' | 'custom';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'disputed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          organic_id: number | null;
          wallet_pubkey: string | null;
          role: UserRole;
          email: string;
          name: string | null;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          website: string | null;
          twitter: string | null;
          discord: string | null;
          total_points: number | null;
          tasks_completed: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organic_id?: number | null;
          wallet_pubkey?: string | null;
          role?: UserRole;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          website?: string | null;
          twitter?: string | null;
          discord?: string | null;
          total_points?: number | null;
          tasks_completed?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organic_id?: number | null;
          wallet_pubkey?: string | null;
          role?: UserRole;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          website?: string | null;
          twitter?: string | null;
          discord?: string | null;
          total_points?: number | null;
          tasks_completed?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orgs: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          theme: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          theme?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          theme?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          id: string;
          org_id: string | null;
          title: string;
          body: string;
          status: ProposalStatus;
          created_by: string;
          closes_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          title: string;
          body: string;
          status?: ProposalStatus;
          created_by: string;
          closes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          title?: string;
          body?: string;
          status?: ProposalStatus;
          created_by?: string;
          closes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          org_id: string | null;
          proposal_id: string;
          voter_id: string;
          value: VoteValue;
          weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          proposal_id: string;
          voter_id: string;
          value: VoteValue;
          weight: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          proposal_id?: string;
          voter_id?: string;
          value?: VoteValue;
          weight?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          org_id: string | null;
          proposal_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          points: number | null;
          base_points: number | null;
          assignee_id: string | null;
          sprint_id: string | null;
          task_type: TaskType;
          is_team_task: boolean;
          max_assignees: number;
          priority: TaskPriority;
          due_date: string | null;
          labels: string[];
          claimed_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          proposal_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          points?: number | null;
          base_points?: number | null;
          assignee_id?: string | null;
          sprint_id?: string | null;
          task_type?: TaskType;
          is_team_task?: boolean;
          max_assignees?: number;
          priority?: TaskPriority;
          due_date?: string | null;
          labels?: string[];
          claimed_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          proposal_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          points?: number | null;
          base_points?: number | null;
          assignee_id?: string | null;
          sprint_id?: string | null;
          task_type?: TaskType;
          is_team_task?: boolean;
          max_assignees?: number;
          priority?: TaskPriority;
          due_date?: string | null;
          labels?: string[];
          claimed_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_likes: {
        Row: {
          task_id: string;
          user_id: string;
          created_at: string | null;
        };
        Insert: {
          task_id: string;
          user_id: string;
          created_at?: string | null;
        };
        Update: {
          task_id?: string;
          user_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      task_submissions: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          submission_type: TaskType;
          pr_link: string | null;
          testing_notes: string | null;
          content_link: string | null;
          content_text: string | null;
          reach_metrics: Json | null;
          file_urls: string[] | null;
          revision_notes: string | null;
          description: string | null;
          custom_fields: Json | null;
          review_status: ReviewStatus;
          quality_score: number | null;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          rejection_reason: string | null;
          earned_points: number | null;
          submitted_at: string;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          submission_type: TaskType;
          pr_link?: string | null;
          testing_notes?: string | null;
          content_link?: string | null;
          content_text?: string | null;
          reach_metrics?: Json | null;
          file_urls?: string[] | null;
          revision_notes?: string | null;
          description?: string | null;
          custom_fields?: Json | null;
          review_status?: ReviewStatus;
          quality_score?: number | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          rejection_reason?: string | null;
          earned_points?: number | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          submission_type?: TaskType;
          pr_link?: string | null;
          testing_notes?: string | null;
          content_link?: string | null;
          content_text?: string | null;
          reach_metrics?: Json | null;
          file_urls?: string[] | null;
          revision_notes?: string | null;
          description?: string | null;
          custom_fields?: Json | null;
          review_status?: ReviewStatus;
          quality_score?: number | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          rejection_reason?: string | null;
          earned_points?: number | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          claimed_at: string;
          submission_id: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          claimed_at?: string;
          submission_id?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          claimed_at?: string;
          submission_id?: string | null;
        };
        Relationships: [];
      };
      sprints: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          start_at: string;
          end_at: string;
          status: SprintStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          start_at: string;
          end_at: string;
          status?: SprintStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          start_at?: string;
          end_at?: string;
          status?: SprintStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          org_id: string | null;
          subject_type: string;
          subject_id: string;
          user_id: string;
          body: string;
          attachments: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          subject_type: string;
          subject_id: string;
          user_id: string;
          body: string;
          attachments?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          subject_type?: string;
          subject_id?: string;
          user_id?: string;
          body?: string;
          attachments?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      holder_snapshots: {
        Row: {
          id: string;
          org_id: string | null;
          proposal_id: string;
          wallet_pubkey: string;
          balance_ui: number;
          taken_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          proposal_id: string;
          wallet_pubkey: string;
          balance_ui: number;
          taken_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          proposal_id?: string;
          wallet_pubkey?: string;
          balance_ui?: number;
          taken_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_nonces: {
        Row: {
          id: string;
          nonce: string;
          user_id: string | null;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nonce: string;
          user_id?: string | null;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nonce?: string;
          user_id?: string | null;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_next_organic_id: {
        Args: Record<string, never>;
        Returns: number;
      };
      cleanup_expired_nonces: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      proposal_status: ProposalStatus;
      task_status: TaskStatus;
      sprint_status: SprintStatus;
      vote_value: VoteValue;
      task_type: TaskType;
      review_status: ReviewStatus;
      task_priority: TaskPriority;
    };
  };
}
