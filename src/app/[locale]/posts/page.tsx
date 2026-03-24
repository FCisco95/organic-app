'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { usePosts, useLikePost, type PostSortInput } from '@/features/posts';
import { cn } from '@/lib/utils';
import { PostFeedCard, PostCardSkeleton } from '@/components/posts/PostFeedCard';
import { PostComposerDialog, PostComposerFab } from '@/components/posts/PostComposerDialog';

type PostSort = PostSortInput;

const SORT_OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
  { value: 'top_week', label: 'Top This Week' },
];

const TYPE_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'text', label: 'Posts' },
  { value: 'thread', label: 'Threads' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'link_share', label: 'Links' },
] as const;

export default function PostsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [sort, setSort] = useState<PostSort>('new');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [composerOpen, setComposerOpen] = useState(false);

  const postsQuery = usePosts({ sort, search, type: typeFilter });
  const likePost = useLikePost();

  const hasOrganicId = Boolean(profile?.organic_id);

  async function onLike(postId: string) {
    if (!profile) {
      toast.error('You must be logged in to like posts');
      return;
    }
    try {
      await likePost.mutateAsync(postId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to like post';
      toast.error(message);
    }
  }

  const posts = postsQuery.data ?? [];

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground font-display">Community Posts</h1>
          <p className="text-sm text-muted-foreground">Share updates, start discussions, and connect with the community.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {/* Sort */}
          <div className="flex gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
                  sort === opt.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground self-center shrink-0" />
          {TYPE_FILTERS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                'text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors',
                typeFilter === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="space-y-3">
          {postsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostFeedCard
                key={post.id}
                post={post}
                onLike={onLike}
                onClick={(id) => router.push(`/posts/${id}`)}
                likeLoading={likePost.isPending}
              />
            ))
          )}
        </div>

        {/* FAB + Composer */}
        {hasOrganicId && (
          <>
            <PostComposerFab onClick={() => setComposerOpen(true)} />
            <PostComposerDialog open={composerOpen} onClose={() => setComposerOpen(false)} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
