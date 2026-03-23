'use client';

import { useState, useEffect, useDeferredValue } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import {
  useProposals,
  normalizeProposalStatus,
  type ProposalFilters,
  PROPOSAL_CATEGORIES,
} from '@/features/proposals';
import { Plus, Search, X, ArrowUpDown, Tag, Scale, Wallet, Users, Code, Vote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { FetchErrorBanner } from '@/components/ui/fetch-error-banner';
import { ProposalCard } from '@/components/proposals';
import { LiveVoteBanner } from '@/components/proposals/live-vote-banner';
import { GovernanceSidebar } from '@/components/proposals/governance-sidebar';
import type { ProposalListItem } from '@/features/proposals/types';
import type { ProposalCategory } from '@/features/proposals';

const PAGE_SIZE = 20;

const GOVERNANCE_STAGES = [
  'public',
  'qualified',
  'discussion',
  'voting',
  'finalized',
  'canceled',
] as const;

type SortKey = 'new' | 'hot' | 'most-discussed' | 'most-voted';

const SORT_OPTIONS: { key: SortKey; labelKey: 'sortNew' | 'sortHot' | 'sortMostDiscussed' | 'sortMostVoted' }[] = [
  { key: 'new', labelKey: 'sortNew' },
  { key: 'hot', labelKey: 'sortHot' },
  { key: 'most-discussed', labelKey: 'sortMostDiscussed' },
  { key: 'most-voted', labelKey: 'sortMostVoted' },
];

/** Category icon map for responsive filter pills */
const CATEGORY_ICONS: Record<ProposalCategory, React.ComponentType<{ className?: string }>> = {
  feature: Tag,
  governance: Scale,
  treasury: Wallet,
  community: Users,
  development: Code,
};

/** Short label i18n key map */
const CATEGORY_SHORT_KEYS: Record<ProposalCategory, string> = {
  feature: 'categoryShortFeature',
  governance: 'categoryShortGovernance',
  treasury: 'categoryShortTreasury',
  community: 'categoryShortCommunity',
  development: 'categoryShortDevelopment',
};

function sortProposals(proposals: ProposalListItem[], sort: SortKey): ProposalListItem[] {
  const arr = [...proposals];
  switch (sort) {
    case 'new':
      return arr.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    case 'hot':
    case 'most-discussed':
      return arr.sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0));
    case 'most-voted':
      return arr.sort((a, b) => {
        if (a.status === 'voting' && b.status !== 'voting') return -1;
        if (b.status === 'voting' && a.status !== 'voting') return 1;
        return (b.comments_count ?? 0) - (a.comments_count ?? 0);
      });
  }
}

export default function ProposalsPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Proposals');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<SortKey>('new');
  const deferredSearch = useDeferredValue(searchTerm);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isAdmin = profile?.role && ['admin', 'council'].includes(profile.role);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, categoryFilter, deferredSearch, sort]);

  const filters: ProposalFilters = {};
  if (statusFilter !== 'all') {
    filters.status = statusFilter as ProposalFilters['status'];
  }
  if (categoryFilter !== 'all') {
    filters.category = categoryFilter as ProposalFilters['category'];
  }
  if (deferredSearch.trim()) {
    filters.search = deferredSearch.trim();
  }

  const { data: rawProposals, isLoading, isError, refetch } = useProposals(filters);
  const proposals = rawProposals ? sortProposals(rawProposals, sort) : rawProposals;
  const canCreateProposal = !!profile?.organic_id;

  const totalComments = (rawProposals ?? []).reduce(
    (total, p) => total + (p.comments_count ?? 0),
    0
  );

  const stageCounts = GOVERNANCE_STAGES.reduce<Record<(typeof GOVERNANCE_STAGES)[number], number>>(
    (acc, stage) => ({ ...acc, [stage]: 0 }),
    { public: 0, qualified: 0, discussion: 0, voting: 0, finalized: 0, canceled: 0 }
  );
  for (const p of rawProposals ?? []) {
    const stage = normalizeProposalStatus(p.status);
    if (stage in stageCounts) {
      stageCounts[stage as keyof typeof stageCounts] += 1;
    }
  }

  const votingProposals = (rawProposals ?? []).filter((p) => p.status === 'voting');
  const regularProposals =
    statusFilter === 'all' && votingProposals.length > 0
      ? (proposals ?? []).filter((p) => p.status !== 'voting')
      : (proposals ?? []);

  return (
    <PageContainer layout="fluid">
      {/* Dark hero */}
      <section
        data-testid="proposals-governance-strip"
        className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white mb-6 opacity-0 animate-fade-up stagger-1"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl mb-3">
              <Vote className="w-5 h-5 text-orange-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">{t('subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canCreateProposal && (
              <Link
                href="/proposals/new"
                data-testid="proposals-cta-primary"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newProposal')}
              </Link>
            )}
            {isAdmin && (
              <button
                type="button"
                data-testid="proposals-cta-secondary"
                onClick={() => setStatusFilter('discussion')}
                className="inline-flex items-center rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                {t('reviewDiscussionCta')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_300px] lg:items-start xl:grid-cols-[1fr_320px]">
        {/* Main content column */}
        <div className="min-w-0">
          {/* Search + Sort bar */}
          <div data-testid="proposals-filters" className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  data-testid="proposals-search"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-transparent focus:ring-2 focus:ring-orange-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Status tabs */}
            <div className="relative">
            <div data-testid="proposals-stage-chips" className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide">
              <button
                type="button"
                data-testid="proposals-stage-chip-all"
                onClick={() => setStatusFilter('all')}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {t('filterAll')}
              </button>
              {GOVERNANCE_STAGES.map((status) => (
                <button
                  key={status}
                  type="button"
                  data-testid={`proposals-stage-chip-${status}`}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    {t(
                      `status${status.charAt(0).toUpperCase() + status.slice(1)}` as
                        | 'statusDraft'
                        | 'statusPublic'
                        | 'statusQualified'
                        | 'statusDiscussion'
                        | 'statusVoting'
                        | 'statusFinalized'
                        | 'statusCanceled'
                    )}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 tabular-nums">
                    {stageCounts[status]}
                  </span>
                </button>
              ))}
            </div>

            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent lg:hidden" />
            </div>

            {/* Category pills — Task 12: responsive with icons */}
            <div className="relative">
            <div data-testid="proposals-category-filters" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                data-testid="proposals-category-all"
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('categoryAll')}
              </button>
              {PROPOSAL_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const shortKey = CATEGORY_SHORT_KEYS[cat];
                const fullLabelKey = `category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as
                  | 'categoryFeature'
                  | 'categoryGovernance'
                  | 'categoryTreasury'
                  | 'categoryCommunity'
                  | 'categoryDevelopment';

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    data-testid={`proposals-category-${cat}`}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      categoryFilter === cat
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {/* Short label on mobile, full label on sm+ */}
                    <span className="sm:hidden">{t(shortKey)}</span>
                    <span className="hidden sm:inline">{t(fullLabelKey)}</span>
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent lg:hidden" />
            </div>
          </div>

          {/* Sort + count bar */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {isLoading ? '\u00A0' : t('listSubtitle', { count: proposals?.length ?? 0 })}
            </p>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <div className="flex gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSort(opt.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      sort === opt.key
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live vote banner */}
          {!isLoading &&
            votingProposals.length > 0 &&
            statusFilter !== 'finalized' &&
            statusFilter !== 'canceled' &&
            statusFilter !== 'discussion' &&
            statusFilter !== 'qualified' &&
            statusFilter !== 'public' && (
              <LiveVoteBanner proposals={votingProposals} />
            )}

          {/* Error banner */}
          {isError && <FetchErrorBanner onRetry={() => refetch()} />}

          {/* Proposals list */}
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex animate-pulse gap-0 overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="w-1 flex-shrink-0 bg-slate-200" />
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-slate-200" />
                        <div className="h-3 w-full rounded bg-slate-100" />
                        <div className="h-3 w-2/3 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : regularProposals.length === 0 && votingProposals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="mb-1 text-base font-semibold text-slate-700">
                {deferredSearch ? t('emptySearchTitle') : t('emptyTitle')}
              </h3>
              <p className="mb-5 text-sm text-slate-500">
                {deferredSearch
                  ? t('emptySearchDescription', { search: deferredSearch })
                  : t('emptyState')}
              </p>
              {canCreateProposal && (
                <Link
                  href="/proposals/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" />
                  {t('createFirstProposal')}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5" data-testid="proposals-results">
              {regularProposals.slice(0, visibleCount).map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          )}

          {/* Load more */}
          {proposals && regularProposals.length > visibleCount && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {t('loadMore', { remaining: regularProposals.length - visibleCount })}
              </button>
            </div>
          )}

          {/* Unauthenticated CTA — mobile only */}
          {!user && (
            <div className="mt-8 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-5 lg:hidden">
              <h3 className="mb-1 font-semibold text-slate-900">{t('ctaTitle')}</h3>
              <p className="mb-3 text-sm text-slate-700">{t('ctaDescription')}</p>
              <Link
                href="/login"
                className="inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700"
              >
                {t('signIn')}
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar column — desktop */}
        <div className="hidden lg:block lg:sticky lg:top-6">
          <GovernanceSidebar
            proposals={rawProposals ?? []}
            stageCounts={stageCounts}
            totalComments={totalComments}
            activeStatus={statusFilter}
            onStatusFilter={setStatusFilter}
            user={user}
          />
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="mt-6 lg:hidden">
        <GovernanceSidebar
          proposals={rawProposals ?? []}
          stageCounts={stageCounts}
          totalComments={totalComments}
          activeStatus={statusFilter}
          onStatusFilter={setStatusFilter}
          user={user}
        />
      </div>
    </PageContainer>
  );
}
