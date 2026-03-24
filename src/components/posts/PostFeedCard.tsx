'use client';

import { Heart, MessageCircle, Pin, Megaphone, LinkIcon, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/features/posts';
import type { PostType } from '@/features/posts/types';

interface PostFeedCardProps {
  post: PostListItem;
  onLike?: (postId: string) => void;
  onClick?: (postId: string) => void;
  likeLoading?: boolean;
}

const POST_TYPE_ICONS: Record<PostType, typeof AlignLeft> = {
  text: AlignLeft,
  thread: AlignLeft,
  announcement: Megaphone,
  link_share: LinkIcon,
};

const POST_TYPE_LABELS: Record<PostType, string> = {
  text: 'Post',
  thread: 'Thread',
  announcement: 'Announcement',
  link_share: 'Link',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function PostFeedCard({ post, onLike, onClick, likeLoading }: PostFeedCardProps) {
  const TypeIcon = POST_TYPE_ICONS[post.post_type] ?? AlignLeft;
  const author = post.author;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm',
        post.is_pinned && 'border-amber-200 bg-amber-50/30',
        onClick && 'cursor-pointer'
      )}
      onClick={() => onClick?.(post.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden shrink-0">
          {author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-white">
              {(author.name || author.email).charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">
              {author.name || 'Anonymous'}
            </span>
            {author.organic_id && (
              <span className="text-[10px] font-mono text-muted-foreground">#{author.organic_id}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {post.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            <TypeIcon className="w-2.5 h-2.5" />
            {POST_TYPE_LABELS[post.post_type]}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{post.title}</h3>

      {/* Body preview */}
      {post.body && (
        <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{post.body}</p>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {post.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: actions */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(post.id);
          }}
          disabled={likeLoading}
          className={cn(
            'flex items-center gap-1 text-xs transition-colors',
            post.user_liked
              ? 'text-red-500'
              : 'text-muted-foreground hover:text-red-500'
          )}
        >
          <Heart className={cn('w-3.5 h-3.5', post.user_liked && 'fill-current')} />
          <span className="tabular-nums">{post.likes_count}</span>
        </button>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="tabular-nums">{post.comments_count}</span>
        </span>
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-muted" />
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
      <div className="h-3 w-full bg-muted rounded mb-1" />
      <div className="h-3 w-2/3 bg-muted rounded mb-3" />
      <div className="flex gap-4">
        <div className="h-3 w-10 bg-muted rounded" />
        <div className="h-3 w-10 bg-muted rounded" />
      </div>
    </div>
  );
}
