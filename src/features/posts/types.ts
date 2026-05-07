// ─── Post Types ─────────────────────────────────────────────────────────

export type PostType = 'text' | 'thread' | 'announcement' | 'link_share';
export type PostStatus = 'draft' | 'published' | 'archived' | 'removed';

export interface PostAuthor {
  id: string;
  name: string | null;
  email: string;
  organic_id: number | null;
  avatar_url: string | null;
  easter_2026_egg_elements?: string[] | null;
}

export type PromotionTier = 'spotlight' | 'feature' | 'mega';

export interface Post {
  id: string;
  author_id: string;
  post_type: PostType;
  status: PostStatus;
  title: string;
  body: string;
  tags: string[];
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  twitter_url: string | null;
  boostable: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  is_organic: boolean;
  points_cost: number;
  is_promoted: boolean;
  promotion_tier: PromotionTier | null;
  promotion_points: number;
  promotion_expires_at: string | null;
  flag_count: number;
  organic_bonus_revoked: boolean;
  removed_at: string | null;
  removed_reason: string | null;
  created_at: string;
  updated_at: string;
  detected_language: string | null;
}

export interface PostListItem extends Post {
  author: PostAuthor;
  user_liked: boolean;
}

export interface PostDetail extends Post {
  author: PostAuthor;
  user_liked: boolean;
  thread_parts?: PostThreadPart[];
}

export interface PostThreadPart {
  id: string;
  post_id: string;
  part_order: number;
  body: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
  detected_language: string | null;
  user_profiles: PostAuthor | null;
}

// ─── API Responses ──────────────────────────────────────────────────────

export interface PostFeedResponse {
  items: PostListItem[];
}

export interface PostCommentsResponse {
  comments: PostComment[];
  hasMore: boolean;
  nextCursor: string | null;
}
