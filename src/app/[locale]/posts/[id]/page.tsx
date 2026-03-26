'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Pin,
  Megaphone,
  Send,
  Clock,
  LinkIcon,
  AlignLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { usePost, usePostComments, useLikePost, useAddPostComment } from '@/features/posts/hooks';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

function XLikeButton({ twitterUrl }: { twitterUrl: string | null }) {
  if (!twitterUrl) return null;
  return (
    <button
      onClick={() => window.open(twitterUrl, '_blank')}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all hover:scale-105 px-2 py-1 rounded-md hover:bg-muted"
      title="Like on X"
    >
      <span className="font-bold text-[13px] leading-none" style={{ fontFamily: 'serif' }}>
        &#120143;
      </span>
      <span>Like on X</span>
    </button>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const t = useTranslations('Posts');
  const { profile } = useAuth();

  const postQuery = usePost(postId);
  const commentsQuery = usePostComments(postId);
  const likePost = useLikePost();
  const addComment = useAddPostComment();

  const [commentBody, setCommentBody] = useState('');

  const post = postQuery.data;
  const comments = commentsQuery.data?.comments ?? [];

  async function handleLike() {
    if (!profile) {
      toast.error(t('likeError'));
      return;
    }
    try {
      await likePost.mutateAsync(postId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('likeFailure'));
    }
  }

  async function handleComment() {
    if (!commentBody.trim()) return;
    try {
      await addComment.mutateAsync({ postId, input: { body: commentBody.trim() } });
      setCommentBody('');
      toast.success(t('detailCommentSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('detailCommentError'));
    }
  }

  if (postQuery.isLoading) {
    return (
      <PageContainer>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!post) {
    return (
      <PageContainer>
        <div className="max-w-3xl mx-auto text-center py-12">
          <p className="text-sm text-muted-foreground">{t('detailNotFound')}</p>
          <Link href="/posts" className="text-xs text-primary hover:underline mt-2 inline-block">
            {t('detailBackToFeed')}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const author = post.author;
  const isAnnouncement = post.post_type === 'announcement';

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors opacity-0 animate-fade-up stagger-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('detailBackToFeed')}
        </Link>

        {/* Post */}
        <article
          className={cn(
            'rounded-2xl border bg-card p-5 sm:p-6 mb-6 opacity-0 animate-fade-up stagger-2',
            isAnnouncement
              ? 'border-l-4 border-l-amber-500/80 border-t-border border-r-border border-b-border'
              : 'border-border',
          )}
        >
          {/* Badges */}
          {(isAnnouncement || post.is_pinned) && (
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
            </div>
          )}

          {/* Author header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden shrink-0">
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">
                  {(author.name || author.email).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{author.name || 'Anonymous'}</span>
                {author.organic_id && (
                  <span className="text-[10px] font-mono text-muted-foreground">#{author.organic_id}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(post.created_at)}
              </p>
            </div>
          </div>

          {/* Title + body */}
          <h1 className="text-xl font-bold text-foreground mb-3 font-display leading-snug">{post.title}</h1>
          <div className="text-sm text-foreground/80 whitespace-pre-wrap mb-4 leading-relaxed">{post.body}</div>

          {/* Thread parts */}
          {post.thread_parts && post.thread_parts.length > 0 && (
            <div className="space-y-3 mb-4 pl-3 border-l-2 border-primary/30">
              {post.thread_parts.map((part) => (
                <div key={part.id} className="text-sm text-foreground/80 whitespace-pre-wrap">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {t('detailThreadPart')} {part.part_order + 1}
                  </span>
                  <p className="mt-0.5">{part.body}</p>
                </div>
              ))}
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

          {/* Actions */}
          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <button
              onClick={handleLike}
              disabled={likePost.isPending}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-all',
                post.user_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500',
              )}
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition-transform',
                  post.user_liked && 'fill-current scale-110',
                )}
              />
              {post.likes_count} {post.likes_count === 1 ? t('detailLikeSingular') : t('detailLikePlural')}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              {post.comments_count} {post.comments_count === 1 ? t('detailCommentSingular') : t('detailCommentPlural')}
            </span>
            <XLikeButton twitterUrl={post.twitter_url} />
          </div>
        </article>

        {/* Comments */}
        <div className="space-y-4 opacity-0 animate-fade-up stagger-3">
          <h2 className="text-sm font-semibold text-foreground">{t('detailCommentsTitle')}</h2>

          {/* Comment input */}
          {profile?.organic_id && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('detailCommentPlaceholder')}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleComment}
                disabled={addComment.isPending || !commentBody.trim()}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{t('detailNoComments')}</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const cAuthor = comment.user_profiles;
                return (
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                      {cAuthor?.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cAuthor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] font-bold text-white">
                          {(cAuthor?.name || cAuthor?.email || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {cAuthor?.name || 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5">{comment.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
