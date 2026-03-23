'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Search, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import {
  type IdeaSort,
  type IdeaListItem,
  useCreateIdea,
  useIdeas,
  useIdeasKpis,
  useVoteIdea,
} from '@/features/ideas';
import { cn } from '@/lib/utils';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { Skeleton } from '@/components/ui/skeleton';
import { IdeaKpiCard } from '@/components/ideas/IdeaKpiCard';
import { IdeaFeedCard } from '@/components/ideas/IdeaFeedCard';
import { IdeaComposerDialog, IdeaComposerFab } from '@/components/ideas/IdeaComposerDialog';
import { IdeaEmptyState } from '@/components/ideas/IdeaEmptyState';

type FeedTab = 'all' | 'trending' | 'promoted';

const SORTS: IdeaSort[] = ['hot', 'new', 'top_week', 'top_all'];

export default function IdeasPage() {
  const t = useTranslations('Ideas');
  const { profile } = useAuth();
  const [sort, setSort] = useState<IdeaSort>('hot');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');

  const enabled = isIdeasIncubatorEnabled();

  const ideasQuery = useIdeas({ sort, search, enabled });
  const kpisQuery = useIdeasKpis({ enabled });
  const voteIdea = useVoteIdea();

  // Derive spotlight from KPI data
  const spotlightId = kpisQuery.data?.spotlight?.id ?? null;

  // Client-side tab filtering
  const filteredIdeas = useMemo(() => {
    const items = ideasQuery.data ?? [];
    switch (activeTab) {
      case 'trending':
        return items.filter((i) => i.score > 0).sort((a, b) => b.score - a.score);
      case 'promoted':
        return items.filter((i) => i.promoted_to_proposal_id != null);
      default:
        return items;
    }
  }, [ideasQuery.data, activeTab]);

  async function onVote(ideaId: string, next: 'up' | 'none') {
    try {
      await voteIdea.mutateAsync({ ideaId, input: { value: next } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('voteError');
      toast.error(message);
    }
  }

  if (!enabled) {
    return (
      <PageContainer width="narrow" className="py-14 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('disabledTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('disabledDescription')}</p>
      </PageContainer>
    );
  }

  // Compute KPI bar percentages (relative to total)
  const totalIdeas = kpisQuery.data?.total_ideas ?? 0;
  const activeIdeas = kpisQuery.data?.active_ideas ?? 0;
  const promotedIdeas = kpisQuery.data?.promoted_ideas ?? 0;
  const conversionRate = kpisQuery.data?.conversion_rate ?? 0;
  const kpiLoading = kpisQuery.isLoading;

  return (
    <PageContainer layout="fluid">
      {/* ── Dark gradient header ────────────────────────────────── */}
      <section className="relative -mx-4 -mt-6 overflow-hidden bg-foreground px-4 pb-8 pt-10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-12 xl:px-12">
        {/* Gradient fade at bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{t('title')}</h1>
              <p className="mt-1 max-w-2xl text-white/70">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/proposals"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                <TrendingUp className="h-4 w-4" />
                {t('governanceCta')}
              </Link>
              <div className="hidden md:block">
                <IdeaComposerDialog />
              </div>
            </div>
          </div>

          {/* ── KPI cards ─────────────────────────────────────── */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <IdeaKpiCard
              label={t('kpiTotalIdeas')}
              value={totalIdeas}
              barPercent={100}
              barColor="bg-foreground/30"
              isLoading={kpiLoading}
            />
            <IdeaKpiCard
              label={t('kpiActiveIdeas')}
              value={activeIdeas}
              trend={totalIdeas > 0 ? Math.round((activeIdeas / totalIdeas) * 100) : 0}
              barPercent={totalIdeas > 0 ? (activeIdeas / totalIdeas) * 100 : 0}
              barColor="bg-emerald-500"
              isLoading={kpiLoading}
            />
            <IdeaKpiCard
              label={t('kpiPromoted')}
              value={promotedIdeas}
              trend={totalIdeas > 0 ? Math.round((promotedIdeas / totalIdeas) * 100) : 0}
              barPercent={totalIdeas > 0 ? (promotedIdeas / totalIdeas) * 100 : 0}
              barColor="bg-organic-terracotta"
              isLoading={kpiLoading}
            />
            <IdeaKpiCard
              label={t('kpiConversion')}
              value={`${conversionRate}%`}
              barPercent={conversionRate}
              barColor="bg-organic-golden"
              isLoading={kpiLoading}
            />
          </div>
        </div>
      </section>

      {/* ── Tab-based feed views ──────────────────────────────── */}
      <section className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto border-b border-border">
            {(['all', 'trending', 'promoted'] as FeedTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'font-bold text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(`tab_${tab}` as 'tab_all' | 'tab_trending' | 'tab_promoted')}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-organic-terracotta transition-all duration-200" />
                )}
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 sm:w-64"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as IdeaSort)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`sort_${s}` as 'sort_hot' | 'sort_new' | 'sort_top_week' | 'sort_top_all')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Feed cards ──────────────────────────────────────── */}
        <div className="mt-5">
          {ideasQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <Skeleton className="mb-3 h-5 w-16" />
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="mt-4 flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : ideasQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-medium text-red-800">{t('feedError')}</p>
              <button
                type="button"
                onClick={() => ideasQuery.refetch()}
                className="mt-2 text-sm font-semibold text-organic-terracotta hover:text-organic-terracotta-hover"
              >
                {t('retry')}
              </button>
            </div>
          ) : filteredIdeas.length > 0 ? (
            <div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              data-testid="ideas-feed-list"
            >
              {filteredIdeas.map((idea, index) => (
                <IdeaFeedCard
                  key={idea.id}
                  idea={idea}
                  onVote={onVote}
                  isSpotlight={idea.id === spotlightId}
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'backwards',
                  }}
                />
              ))}
            </div>
          ) : (
            <IdeaEmptyState />
          )}
        </div>
      </section>

      {/* Mobile FAB */}
      <IdeaComposerFab />
    </PageContainer>
  );
}
