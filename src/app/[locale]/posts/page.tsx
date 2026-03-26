'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Search,
  SlidersHorizontal,
  Plus,
  MessageSquare,
  LayoutGrid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { PageHero } from '@/components/ui/page-hero';
import { useAuth } from '@/features/auth/context';
import { usePosts, useLikePost, type PostSortInput } from '@/features/posts';
import { cn } from '@/lib/utils';
import {
  PostFeedCard,
  FeaturedPostCard,
  CompactPostRow,
  PostCardSkeleton,
  FeaturedCardSkeleton,
  CompactRowSkeleton,
} from '@/components/posts/PostFeedCard';
import {
  PostComposerDialog,
  PostComposerFab,
  InlineComposeBar,
} from '@/components/posts/PostComposerDialog';

type PostSort = PostSortInput;
type ViewMode = 'cards' | 'compact';

const VIEW_MODE_KEY = 'organic-posts-view-mode';

const SORT_KEYS: { value: PostSort; labelKey: string }[] = [
  { value: 'new', labelKey: 'sortNew' },
  { value: 'popular', labelKey: 'sortPopular' },
  { value: 'top_week', labelKey: 'sortTopWeek' },
];

const TYPE_FILTER_KEYS = [
  { value: undefined, labelKey: 'filterAll' },
  { value: 'text', labelKey: 'filterPosts' },
  { value: 'thread', labelKey: 'filterThreads' },
  { value: 'announcement', labelKey: 'filterAnnouncements' },
  { value: 'link_share', labelKey: 'filterLinks' },
] as const;

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>('cards');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === 'cards' || stored === 'compact') {
        setMode(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  function updateMode(v: ViewMode) {
    setMode(v);
    try {
      localStorage.setItem(VIEW_MODE_KEY, v);
    } catch {
      // ignore
    }
  }

  return [mode, updateMode];
}

export default function PostsPage() {
  const router = useRouter();
  const t = useTranslations('Posts');
  const { profile } = useAuth();
  const [sort, setSort] = useState<PostSort>('new');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewMode, setViewMode] = useViewMode();

  const postsQuery = usePosts({ sort, search, type: typeFilter });
  const likePost = useLikePost();

  const hasOrganicId = Boolean(profile?.organic_id);

  async function onLike(postId: string) {
    if (!profile) {
      toast.error(t('likeError'));
      return;
    }
    try {
      await likePost.mutateAsync(postId);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('likeFailure');
      toast.error(message);
    }
  }

  const posts = postsQuery.data ?? [];

  // Separate featured (pinned + announcements) from regular
  const featuredPosts = posts.filter(
    (p) => p.is_pinned || p.post_type === 'announcement',
  );
  const regularPosts = posts.filter(
    (p) => !p.is_pinned && p.post_type !== 'announcement',
  );

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <PageHero
          icon={MessageSquare}
          title={t('heroTitle')}
          description={t('heroDescription')}
        >
          {hasOrganicId && (
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t('newPost')}
            </button>
          )}
        </PageHero>

        {/* Inline Composer */}
        <div className="mt-4">
          <InlineComposeBar onExpand={() => setComposerOpen(true)} />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5 mb-4 opacity-0 animate-fade-up stagger-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Sort + View toggle */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {SORT_KEYS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
                    sort === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden ml-1">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 transition-colors',
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                title={t('viewCards')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={cn(
                  'p-1.5 transition-colors',
                  viewMode === 'compact'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                title={t('viewCompact')}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto opacity-0 animate-fade-up stagger-4">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground self-center shrink-0" />
          {TYPE_FILTER_KEYS.map((opt) => (
            <button
              key={opt.labelKey}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                'text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors',
                typeFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        {/* Feed */}
        {postsQuery.isLoading ? (
          <div className="space-y-3">
            {viewMode === 'cards' ? (
              <>
                <FeaturedCardSkeleton />
                {Array.from({ length: 3 }).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </>
            ) : (
              Array.from({ length: 8 }).map((_, i) => (
                <CompactRowSkeleton key={i} />
              ))
            )}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 opacity-0 animate-fade-up stagger-5">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* ─── Card View ──────────────────────────────────── */
          <div className="space-y-3">
            {/* Featured section */}
            {featuredPosts.length > 0 && (
              <div className="space-y-3 mb-2">
                {featuredPosts.map((post, idx) => (
                  <FeaturedPostCard
                    key={post.id}
                    post={post}
                    index={idx}
                    onLike={onLike}
                    onClick={(id) => router.push(`/posts/${id}`)}
                    likeLoading={likePost.isPending}
                  />
                ))}
              </div>
            )}

            {/* Regular feed */}
            {regularPosts.length > 0 && (
              <div className="space-y-3">
                {regularPosts.map((post) => (
                  <PostFeedCard
                    key={post.id}
                    post={post}
                    onLike={onLike}
                    onClick={(id) => router.push(`/posts/${id}`)}
                    likeLoading={likePost.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ─── Compact List View ──────────────────────────── */
          <div className="rounded-xl border border-border bg-card overflow-hidden opacity-0 animate-fade-up stagger-5">
            {posts.map((post) => (
              <CompactPostRow
                key={post.id}
                post={post}
                onLike={onLike}
                onClick={(id) => router.push(`/posts/${id}`)}
                likeLoading={likePost.isPending}
              />
            ))}
          </div>
        )}

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
