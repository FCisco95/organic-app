import { Database, ProposalCategory } from '@/types/database';

export type Idea = Database['public']['Tables']['ideas']['Row'];
export type IdeaInsert = Database['public']['Tables']['ideas']['Insert'];
export type IdeaUpdate = Database['public']['Tables']['ideas']['Update'];

export type IdeaVote = Database['public']['Tables']['idea_votes']['Row'];
export type IdeaVoteInsert = Database['public']['Tables']['idea_votes']['Insert'];
export type IdeaVoteUpdate = Database['public']['Tables']['idea_votes']['Update'];

export type IdeaSort = 'hot' | 'new' | 'top_week' | 'top_all';
export type IdeaVoteValue = -1 | 0 | 1;

export interface IdeaAuthor {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
}

export interface IdeaListItem extends Idea {
  author: IdeaAuthor | null;
  user_vote: IdeaVoteValue;
}

export interface IdeaLinkedProposal {
  id: string;
  title: string;
  status: string | null;
}

export interface IdeaDetail extends IdeaListItem {
  linked_proposal: IdeaLinkedProposal | null;
}

export interface IdeaComment {
  id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  user_profiles: {
    name: string | null;
    email: string;
    organic_id: number | null;
    avatar_url: string | null;
  };
}

export interface IdeaFeedResponse {
  items: IdeaListItem[];
}

export interface IdeaCommentsResponse {
  comments: IdeaComment[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface IdeasKpisResponse {
  total_ideas: number;
  active_ideas: number;
  promoted_ideas: number;
  conversion_rate: number;
  current_cycle_start: string;
  current_cycle_end: string;
  spotlight: {
    id: string;
    title: string;
    score: number;
    comments_count: number;
    upvotes: number;
    downvotes: number;
  } | null;
}

export const IDEA_PROPOSAL_CATEGORY_FALLBACK: ProposalCategory = 'community';
