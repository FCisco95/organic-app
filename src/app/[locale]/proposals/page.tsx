'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import {
  useProposals,
  normalizeProposalStatus,
  type ProposalFilters,
  PROPOSAL_CATEGORIES,
  PROPOSAL_CATEGORY_LABELS,
} from '@/features/proposals';
import type { ProposalCategory } from '@/features/proposals';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { ProposalCard } from '@/components/proposals';
import { formatDistanceToNow } from 'date-fns';

const STATUS_FILTERS = [
  'all',
  'public',
  'qualified',
  'discussion',
  'voting',
  'finalized',
  'canceled',
] as const;

const GOVERNANCE_STAGES = [
  'public',
  'qualified',
  'discussion',
  'voting',
  'finalized',
  'canceled',
] as const;

export default function ProposalsPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Proposals');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filters: ProposalFilters = {};
  if (statusFilter !== 'all') {
    filters.status = statusFilter as ProposalFilters['status'];
  }
  if (categoryFilter !== 'all') {
    filters.category = categoryFilter as ProposalFilters['category'];
  }

  const { data: proposals, isLoading } = useProposals(filters);

  const canCreateProposal = !!profile?.organic_id;
  const totalComments = (proposals ?? []).reduce((total, proposal) => total + (proposal.comments_count ?? 0), 0);
  const stageCounts = GOVERNANCE_STAGES.reduce<Record<(typeof GOVERNANCE_STAGES)[number], number>>(
    (acc, stage) => ({ ...acc, [stage]: 0 }),
    {
      public: 0,
      qualified: 0,
      discussion: 0,
      voting: 0,
      finalized: 0,
      canceled: 0,
    }
  );

  for (const proposal of proposals ?? []) {
    const stage = normalizeProposalStatus(proposal.status);
    if (stage in stageCounts) {
      stageCounts[stage as keyof typeof stageCounts] += 1;
    }
  }

  const latestCreatedAt = (proposals ?? [])
    .map((proposal) => proposal.created_at)
    .filter((value): value is string => typeof value === 'string')
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  return (
    <PageContainer>
      <div
        data-testid="proposals-governance-strip"
        className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-100 p-6 shadow-sm mb-6"
      >
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700 font-semibold">
                {t('governanceSignalLabel')}
              </p>
              <h1 className="text-3xl font-black text-slate-900 mt-1">{t('title')}</h1>
              <p className="text-slate-700 mt-1 max-w-2xl">{t('subtitle')}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              {canCreateProposal && (
                <Link
                  href="/proposals/new"
                  data-testid="proposals-cta-primary"
                  className="inline-flex items-center gap-2 rounded-xl bg-organic-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4" />
                  {t('newProposal')}
                </Link>
              )}
              <button
                type="button"
                data-testid="proposals-cta-secondary"
                onClick={() => setStatusFilter('discussion')}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {t('reviewDiscussionCta')}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('metricOpenLifecycle')}</p>
              <p className="text-2xl font-black text-slate-900">
                {(stageCounts.public ?? 0) + (stageCounts.qualified ?? 0) + (stageCounts.discussion ?? 0) + (stageCounts.voting ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('metricVotingNow')}</p>
              <p className="text-2xl font-black text-slate-900">{stageCounts.voting ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('metricDiscussionVolume')}</p>
              <p className="text-2xl font-black text-slate-900">{totalComments}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('metricLastUpdate')}</p>
              <p className="text-sm font-semibold text-slate-800">
                {latestCreatedAt
                  ? formatDistanceToNow(new Date(latestCreatedAt), { addSuffix: true })
                  : t('metricLastUpdateEmpty')}
              </p>
            </div>
          </div>

          <div
            data-testid="proposals-stage-chips"
            className="flex flex-wrap gap-2 rounded-2xl border border-amber-100 bg-white/75 p-3"
          >
            {GOVERNANCE_STAGES.map((status) => (
              <button
                key={status}
                type="button"
                data-testid={`proposals-stage-chip-${status}`}
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>
                  {t(
                    `status${status.charAt(0).toUpperCase() + status.slice(1)}` as
                      | `statusDraft`
                      | `statusPublic`
                      | `statusQualified`
                      | `statusDiscussion`
                      | `statusVoting`
                      | `statusFinalized`
                      | `statusCanceled`
                  )}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {stageCounts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900">{t('discoveryTitle')}</h2>
        <p className="text-sm text-slate-600">{t('discoverySubtitle')}</p>
      </div>

      <div data-testid="proposals-filters" className="mb-6 space-y-3">
        <div data-testid="proposals-status-filters" className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              data-testid={`proposals-status-${status}`}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-organic-orange text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status === 'all'
                ? t('filterAll')
                : t(
                    `status${status.charAt(0).toUpperCase() + status.slice(1)}` as
                      | `statusDraft`
                      | `statusPublic`
                      | `statusQualified`
                      | `statusDiscussion`
                      | `statusVoting`
                      | `statusFinalized`
                      | `statusCanceled`
                  )}
            </button>
          ))}
        </div>

        <div data-testid="proposals-category-filters" className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setCategoryFilter('all')}
            data-testid="proposals-category-all"
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              categoryFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('categoryAll')}
          </button>
          {PROPOSAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              data-testid={`proposals-category-${cat}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {PROPOSAL_CATEGORY_LABELS[cat as ProposalCategory]}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{t('listTitle')}</h3>
          <p className="text-gray-600 mt-1">{t('listSubtitle', { count: proposals?.length ?? 0 })}</p>
        </div>

        {canCreateProposal && statusFilter !== 'all' && (
          <Link
            href="/proposals/new"
            className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('newProposal')}
          </Link>
        )}
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : !proposals || proposals.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">{t('emptyState')}</p>
          {canCreateProposal && (
            <Link
              href="/proposals/new"
              className="inline-flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('createFirstProposal')}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4" data-testid="proposals-results">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}

      {/* Info Banner for unauthenticated users */}
      {!user && (
        <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">{t('ctaTitle')}</h3>
          <p className="text-gray-700 mb-4">{t('ctaDescription')}</p>
          <Link
            href="/login"
            className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {t('signIn')}
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
