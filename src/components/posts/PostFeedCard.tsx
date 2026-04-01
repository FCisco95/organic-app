'use client';

import { Heart, MessageCircle, Pin, Megaphone, LinkIcon, AlignLeft, Clock, Leaf, Flag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostListItem } from '@/features/posts';
import type { PostType } from '@/features/posts/types';
import { useTranslations } from 'next-intl';
import { LinkPreviewCard } from '@/components/posts/LinkPreviewCard';

/* ─── Shared types ─────────────────────────────────────────────────────── */

interface PostFeedCardProps {
  post: PostListItem;
  onLike?: (postId: string) => void;
  onClick?: (postId: string) => void;
  onFlag?: (postId: string) => void;
  likeLoading?: boolean;
}

interface FeaturedPostCardProps extends PostFeedCardProps {
  index: number;
}

// CompactPostRow uses PostFeedCardProps directly

/* ─── Lookup maps ──────────────────────────────────────────────────────── */

const POST_TYPE_ICONS: Record<PostType, typeof AlignLeft> = {
  text: AlignLeft,
  thread: AlignLeft,
  announcement: Megaphone,
  link_share: LinkIcon,
};

const POST_TYPE_LABEL_KEYS: Record<PostType, string> = {
  text: 'typePost',
  thread: 'typeThread',
  announcement: 'typeAnnouncement',
  link_share: 'typeLink',
};

/* ─── Helpers ──────────────────────────────────────────────────────────── */

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

function AuthorAvatar({ author, size }: { author: PostListItem['author']; size: number }) {
  return (
    <div
      className="rounded-full bg-gradient-to-br from-organic-terracotta to-yellow-300 flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {author.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-bold text-white"
          style={{ fontSize: size * 0.38 }}
        >
          {(author.name || author.email).charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function XLikeButton({ post, iconOnly = false }: { post: PostListItem; iconOnly?: boolean }) {
  if (!post.twitter_url) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        window.open(post.twitter_url!, '_blank');
      }}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium transition-all',
        'text-muted-foreground hover:text-foreground',
        'hover:scale-105',
        iconOnly ? 'px-0' : 'px-1.5 py-0.5 rounded-md hover:bg-muted'
      )}
      title="Like on X"
    >
      <span className="font-bold text-[13px] leading-none" style={{ fontFamily: 'serif' }}>
        &#120143;
      </span>
      {!iconOnly && <span>Like</span>}
    </button>
  );
}

/* ─── Featured Post Card ───────────────────────────────────────────────── */

export function FeaturedPostCard({ post, onLike, onClick, onFlag, likeLoading, index }: FeaturedPostCardProps & { onFlag?: (postId: string) => void }) {
  const t = useTranslations('Posts');
  const TypeIcon = POST_TYPE_ICONS[post.post_type] ?? AlignLeft;
  const author = post.author;
  const isAnnouncement = post.post_type === 'announcement';
  const isPromotedActive = post.is_promoted && post.promotion_expires_at && new Date(post.promotion_expires_at) > new Date();

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card p-5 sm:p-6 transition-all duration-300',
        'hover:shadow-lg hover:shadow-black/5 hover:scale-[1.005]',
        'opacity-0 animate-fade-up',
        index === 0 ? 'stagger-2' : 'stagger-3',
        isAnnouncement
          ? 'border-l-4 border-l-amber-500/80 border-t-border border-r-border border-b-border'
          : isPromotedActive
            ? 'border-amber-400/50 shadow-amber-500/5 shadow-md'
            : post.is_pinned
              ? 'border-amber-500/30'
              : 'border-border',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(post.id)}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-3">
        {isAnnouncement && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <Megaphone className="w-3 h-3" />
            {t('badgeAnnouncement')}
          </span>
        )}
        {post.is_pinned && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <Pin className="w-3 h-3" />
            {t('badgePinned')}
          </span>
        )}
        {post.is_organic && !post.organic_bonus_revoked && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
            <Leaf className="w-3 h-3" />
            {t('badgeOrganic')}
          </span>
        )}
        {isPromotedActive && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            {post.promotion_tier === 'mega' ? t('badgeMegaBoost') : post.promotion_tier === 'feature' ? t('badgeFeatured') : t('badgePromoted')}
          </span>
        )}
        {!isAnnouncement && !post.is_pinned && !post.is_organic && !isPromotedActive && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            <TypeIcon className="w-2.5 h-2.5" />
            {t(POST_TYPE_LABEL_KEYS[post.post_type])}
          </span>
        )}
      </div>

      {/* Title — large */}
      <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 font-display leading-snug">
        {post.title}
      </h3>

      {/* Body — extended preview */}
      {post.body && (
        <p className="text-sm text-muted-foreground line-clamp-6 mb-4 leading-relaxed">{post.body}</p>
      )}

      {/* Link preview */}
      {post.twitter_url && (
        <div className="mb-3">
          <LinkPreviewCard
            url={post.twitter_url}
            ogTitle={post.og_title}
            ogDescription={post.og_description}
            ogImageUrl={post.og_image_url}
          />
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {post.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-3">
        <AuthorAvatar author={author} size={32} />
        <div>
          <span className="text-sm font-medium text-foreground">
            {author.name || 'Anonymous'}
          </span>
          {author.organic_id && (
            <span className="text-[10px] font-mono text-muted-foreground ml-1">#{author.organic_id}</span>
          )}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(post.created_at)}
          </p>
        </div>
      </div>

      {/* Engagement bar */}
      <div className="flex items-center gap-4 pt-3 border-t border-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(post.id);
          }}
          disabled={likeLoading}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium transition-all',
            post.user_liked
              ? 'text-red-500'
              : 'text-muted-foreground hover:text-red-500',
          )}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-transform',
              post.user_liked && 'fill-current scale-110',
            )}
          />
          <span className="tabular-nums">{post.likes_count}</span>
        </button>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span className="tabular-nums">{post.comments_count}</span>
        </span>
        <XLikeButton post={post} />
        {/* Flag button — only on organic posts */}
        {post.is_organic && !post.organic_bonus_revoked && onFlag && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlag(post.id);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-organic-terracotta transition-colors ml-auto"
            title={t('flagButton')}
          >
            <Flag className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Regular Post Card ────────────────────────────────────────────────── */

export function PostFeedCard({ post, onLike, onClick, onFlag, likeLoading }: PostFeedCardProps) {
  const t = useTranslations('Posts');
  const TypeIcon = POST_TYPE_ICONS[post.post_type] ?? AlignLeft;
  const author = post.author;
  const isPromotedActive = post.is_promoted && post.promotion_expires_at && new Date(post.promotion_expires_at) > new Date();

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-4 transition-all duration-200',
        'hover:shadow-sm hover:border-border/80',
        isPromotedActive ? 'border-amber-400/50' : 'border-border',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(post.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <AuthorAvatar author={author} size={28} />
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
          {post.is_organic && !post.organic_bonus_revoked && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">
              <Leaf className="w-2.5 h-2.5" />
            </span>
          )}
          {isPromotedActive && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" />
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            <TypeIcon className="w-2.5 h-2.5" />
            {t(POST_TYPE_LABEL_KEYS[post.post_type])}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{post.title}</h3>

      {/* Body preview */}
      {post.body && (
        <p className="text-[13px] text-muted-foreground line-clamp-3 mb-2">{post.body}</p>
      )}

      {/* Link preview */}
      {post.twitter_url && (
        <div className="mb-2">
          <LinkPreviewCard
            url={post.twitter_url}
            ogTitle={post.og_title}
            ogDescription={post.og_description}
            ogImageUrl={post.og_image_url}
            compact
          />
        </div>
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

      {/* Footer */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(post.id);
          }}
          disabled={likeLoading}
          className={cn(
            'flex items-center gap-1 text-xs transition-all',
            post.user_liked
              ? 'text-red-500'
              : 'text-muted-foreground hover:text-red-500',
          )}
        >
          <Heart
            className={cn(
              'w-3.5 h-3.5 transition-transform',
              post.user_liked && 'fill-current scale-110',
            )}
          />
          <span className="tabular-nums">{post.likes_count}</span>
        </button>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="tabular-nums">{post.comments_count}</span>
        </span>
        <XLikeButton post={post} />
        {post.is_organic && !post.organic_bonus_revoked && onFlag && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlag(post.id);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-organic-terracotta transition-colors ml-auto"
            title={t('flagButton')}
          >
            <Flag className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Compact List Row ─────────────────────────────────────────────────── */

export function CompactPostRow({ post, onLike, onClick, onFlag, likeLoading }: PostFeedCardProps) {
  const t = useTranslations('Posts');
  const TypeIcon = POST_TYPE_ICONS[post.post_type] ?? AlignLeft;
  const author = post.author;
  const isPromotedActive = post.is_promoted && post.promotion_expires_at && new Date(post.promotion_expires_at) > new Date();

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150',
        'hover:bg-muted/50',
        'border-b border-border/50 last:border-b-0',
        isPromotedActive && 'bg-amber-500/5',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(post.id)}
    >
      {/* Type icon */}
      <TypeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

      {/* Pinned indicator */}
      {post.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 -ml-1" />}

      {/* Organic indicator */}
      {post.is_organic && !post.organic_bonus_revoked && <Leaf className="w-3 h-3 text-green-500 shrink-0 -ml-1" />}

      {/* Promoted indicator */}
      {isPromotedActive && <Sparkles className="w-3 h-3 text-amber-500 shrink-0 -ml-1" />}

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
        {post.title}
      </h4>

      {/* Link domain */}
      {post.twitter_url && (
        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[80px] hidden md:inline">
          {(() => { try { return new URL(post.twitter_url).hostname.replace('www.', ''); } catch { return ''; } })()}
        </span>
      )}

      {/* Author */}
      <span className="text-[11px] text-muted-foreground truncate max-w-[100px] hidden sm:inline">
        {author.name || 'Anonymous'}
      </span>

      {/* Time */}
      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-12 text-right">
        {timeAgo(post.created_at)}
      </span>

      {/* Stats */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(post.id);
          }}
          disabled={likeLoading}
          className={cn(
            'flex items-center gap-0.5 text-[11px] transition-colors',
            post.user_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500',
          )}
        >
          <Heart className={cn('w-3 h-3', post.user_liked && 'fill-current')} />
          <span className="tabular-nums">{post.likes_count}</span>
        </button>
        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
          <MessageCircle className="w-3 h-3" />
          <span className="tabular-nums">{post.comments_count}</span>
        </span>
        <XLikeButton post={post} iconOnly />
      </div>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────────────── */

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

export function FeaturedCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded-full mb-3" />
      <div className="h-5 w-3/4 bg-muted rounded mb-2" />
      <div className="h-3 w-full bg-muted rounded mb-1" />
      <div className="h-3 w-full bg-muted rounded mb-1" />
      <div className="h-3 w-2/3 bg-muted rounded mb-4" />
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
      <div className="flex gap-4 pt-3 border-t border-border">
        <div className="h-3 w-12 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}

export function CompactRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-3.5 h-3.5 bg-muted rounded" />
      <div className="h-3 flex-1 bg-muted rounded" />
      <div className="h-3 w-16 bg-muted rounded" />
      <div className="h-3 w-12 bg-muted rounded" />
    </div>
  );
}
