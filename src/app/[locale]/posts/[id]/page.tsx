'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Heart, MessageCircle, Pin, Megaphone, Send } from 'lucide-react';
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

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
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
      toast.error('You must be logged in');
      return;
    }
    try {
      await likePost.mutateAsync(postId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed');
    }
  }

  async function handleComment() {
    if (!commentBody.trim()) return;
    try {
      await addComment.mutateAsync({ postId, input: { body: commentBody.trim() } });
      setCommentBody('');
      toast.success('Comment posted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post comment');
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
          <p className="text-sm text-muted-foreground">Post not found.</p>
          <Link href="/posts" className="text-xs text-organic-orange hover:underline mt-2 inline-block">
            Back to posts
          </Link>
        </div>
      </PageContainer>
    );
  }

  const author = post.author;

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/posts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to posts
        </Link>

        {/* Post */}
        <article className="rounded-xl border border-border bg-card p-5 mb-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-300 flex items-center justify-center overflow-hidden shrink-0">
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">
                  {(author.name || author.email).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">{author.name || 'Anonymous'}</span>
              {author.organic_id && (
                <span className="text-[10px] font-mono text-muted-foreground ml-1">#{author.organic_id}</span>
              )}
              <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {post.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
              {post.post_type === 'announcement' && <Megaphone className="w-3 h-3 text-blue-500" />}
            </div>
          </div>

          {/* Title + body */}
          <h1 className="text-lg font-bold text-foreground mb-2">{post.title}</h1>
          <div className="text-sm text-foreground/80 whitespace-pre-wrap mb-4">{post.body}</div>

          {/* Thread parts */}
          {post.thread_parts && post.thread_parts.length > 0 && (
            <div className="space-y-3 mb-4 pl-3 border-l-2 border-border">
              {post.thread_parts.map((part) => (
                <div key={part.id} className="text-sm text-foreground/80 whitespace-pre-wrap">
                  <span className="text-[10px] text-muted-foreground font-medium">Part {part.part_order + 1}</span>
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
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <button
              onClick={handleLike}
              disabled={likePost.isPending}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors',
                post.user_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              )}
            >
              <Heart className={cn('w-4 h-4', post.user_liked && 'fill-current')} />
              {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
            </span>
          </div>
        </article>

        {/* Comments */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Comments</h2>

          {/* Comment input */}
          {profile?.organic_id && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <button
                onClick={handleComment}
                disabled={addComment.isPending || !commentBody.trim()}
                className="px-3 py-2 rounded-lg bg-organic-orange text-white text-xs hover:bg-orange-600 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No comments yet.</p>
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
