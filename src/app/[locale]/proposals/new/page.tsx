'use client';

import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useProposal } from '@/features/proposals';
import type { CreateProposalInput } from '@/features/proposals';
import type { ProposalCategory } from '@/features/proposals';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { ProposalWizard } from '@/components/proposals';

export default function NewProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const t = useTranslations('ProposalCreate');

  // Support editing existing drafts via ?edit=PROPOSAL_ID
  const editId = searchParams.get('edit');
  const { data: editingProposal, isLoading: loadingEdit } = useProposal(editId || '');

  const canCreate = !!profile?.organic_id;

  if (!user) {
    return (
      <PageContainer width="narrow" className="text-center py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('signInTitle')}</h1>
        <Link
          href="/login"
          className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {t('signInCta')}
        </Link>
      </PageContainer>
    );
  }

  if (!canCreate) {
    return (
      <PageContainer width="narrow" className="text-center py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('memberOnlyTitle')}</h1>
        <p className="text-gray-600 mb-6">{t('memberOnlyDescription')}</p>
        <Link
          href="/profile"
          className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {t('goToProfile')}
        </Link>
      </PageContainer>
    );
  }

  if (editId && loadingEdit) {
    return (
      <PageContainer width="narrow">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </PageContainer>
    );
  }

  // Build initial data from existing proposal (for editing)
  const initialData: Partial<CreateProposalInput> | undefined = editingProposal
    ? {
        category: (editingProposal.category as ProposalCategory) || 'feature',
        title: editingProposal.title,
        summary: editingProposal.summary || '',
        motivation: editingProposal.motivation || '',
        solution: editingProposal.solution || '',
        budget: editingProposal.budget || '',
        timeline: editingProposal.timeline || '',
      }
    : undefined;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToProposals')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {editId ? t('title').replace('Create New', 'Edit') : t('title')}
        </h1>
        <p className="text-gray-600 mt-1">{t('subtitle')}</p>
      </div>

      {/* Wizard */}
      <ProposalWizard
        initialData={initialData}
        proposalId={editId || undefined}
        onSuccess={(id) => router.push(`/proposals/${id}`)}
      />

      {/* What happens next info */}
      <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">{t('nextTitle')}</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>{t('nextStep1')}</li>
          <li>{t('nextStep2')}</li>
          <li>{t('nextStep3')}</li>
          <li>{t('nextStep4')}</li>
        </ul>
      </div>
    </PageContainer>
  );
}
