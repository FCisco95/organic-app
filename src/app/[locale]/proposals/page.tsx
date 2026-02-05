'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useProposals, type ProposalFilters, PROPOSAL_CATEGORIES, PROPOSAL_CATEGORY_LABELS } from '@/features/proposals';
import type { ProposalCategory } from '@/features/proposals';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { ProposalCard } from '@/components/proposals';

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

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>

        {canCreateProposal && (
          <Link
            href="/proposals/new"
            className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('newProposal')}
          </Link>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['all', 'submitted', 'voting', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-organic-orange text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status === 'all' ? t('filterAll') : t(`status${status.charAt(0).toUpperCase() + status.slice(1)}` as `statusDraft` | `statusSubmitted` | `statusApproved` | `statusRejected` | `statusVoting`)}
          </button>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setCategoryFilter('all')}
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
        <div className="space-y-4">
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
