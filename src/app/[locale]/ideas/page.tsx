'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays, Flame, Lightbulb, MessageCircle, Search, Sparkles, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import {
  type IdeaSort,
  useIdeas,
  useIdeasKpis,
  useModerateIdea,
  useVoteIdea,
} from '@/features/ideas';
import { cn } from '@/lib/utils';
import { isIdeasIncubatorEnabled } from '@/config/feature-flags';
import { IdeaKpiCard } from '@/components/ideas/IdeaKpiCard';
import { IdeaFeedCard, IdeaCardSkeleton, type IdeaModerationAction } from '@/components/ideas/IdeaFeedCard';
import { IdeaComposerDialog, IdeaComposerFab } from '@/components/ideas/IdeaComposerDialog';
import { IdeaEmptyState } from '@/components/ideas/IdeaEmptyState';

type FeedTab = 'all' | 'trending' | 'promoted';

const SORTS: IdeaSort[] = ['hot', 'new', 'top_week', 'top_all'];

const TAB_CONFIG: { key: FeedTab; icon: typeof Flame }[] = [
  { key: 'all', icon: Lightbulb },
  { key: 'trending', icon: Flame },
  { key: 'promoted', icon: TrendingUp },
];

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
  const moderateIdea = useModerateIdea();

  const canModerate = profile?.role === 'admin' || profile?.role === 'council';

  const spotlightId = kpisQuery.data?.spotlight?.id ?? null;

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

  async function onVote(ideaId: string, next: 'up' | 'down' | 'none') {
    try {
      await voteIdea.mutateAsync({ ideaId, input: { value: next } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('voteError');
      toast.error(message);
    }
  }

  async function onModerate(action: IdeaModerationAction) {
    const actionMap = {
      pin: { is_pinned: true },
      unpin: { is_pinned: false },
      lock: { status: 'locked' as const },
      unlock: { status: 'open' as const },
      remove: { status: 'removed' as const },
    };

    try {
      await moderateIdea.mutateAsync({ ideaId: action.ideaId, action: actionMap[action.type] });
      toast.success(t('moderationSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('moderationError');
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

  const totalIdeas = kpisQuery.data?.total_ideas ?? 0;
  const activeIdeas = kpisQuery.data?.active_ideas ?? 0;
  const promotedIdeas = kpisQuery.data?.promoted_ideas ?? 0;
  const conversionRate = kpisQuery.data?.conversion_rate ?? 0;
  const kpiLoading = kpisQuery.isLoading;

  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* TODO: Migrate to <PageHero> — has 3 principle cards inside the hero that go beyond title+description+buttons */}
        {/* ── Dark Hero (matching Analytics/Treasury style) ─────── */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white opacity-0 animate-fade-up stagger-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/ideas/harvest"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                <CalendarDays className="h-4 w-4" />
                {t('harvestCta')}
              </Link>
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

          {/* 3 principle cards (matching Analytics hero) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <Lightbulb className="h-4 w-4 text-[#E8845C]" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('heroProposeTitle')}</p>
                <p className="text-xs text-gray-400">{t('heroProposeDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <MessageCircle className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('heroDiscussTitle')}</p>
                <p className="text-xs text-gray-400">{t('heroDiscussDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('heroPromoteTitle')}</p>
                <p className="text-xs text-gray-400">{t('heroPromoteDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 opacity-0 animate-fade-up stagger-2">
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

        {/* ── Tabs with icons + orange underline (matching Analytics) */}
        <div className="flex items-center gap-1 border-b border-border opacity-0 animate-fade-up stagger-3">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  isActive
                    ? 'border-organic-terracotta text-organic-terracotta dark:text-[#E8845C] font-bold bg-organic-terracotta-lightest dark:bg-organic-terracotta-lightest0/5 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive && 'text-organic-terracotta')} />
                {t(`tab_${tab.key}` as 'tab_all' | 'tab_trending' | 'tab_promoted')}
              </button>
            );
          })}
        </div>

        {/* ── Search + Sort ───────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between opacity-0 animate-fade-up stagger-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 sm:w-72"
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

        {/* ── Feed list ───────────────────────────────────────── */}
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: '320ms' }}>
          {ideasQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <IdeaCardSkeleton key={i} />
              ))}
            </div>
          ) : ideasQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
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
            <div className="space-y-3" data-testid="ideas-feed-list">
              {filteredIdeas.map((idea, index) => (
                <IdeaFeedCard
                  key={idea.id}
                  idea={idea}
                  onVote={onVote}
                  onModerate={canModerate ? onModerate : undefined}
                  canModerate={canModerate}
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
      </div>

      {/* Mobile FAB */}
      <IdeaComposerFab />
    </PageContainer>
  );
}
