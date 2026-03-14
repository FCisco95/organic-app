'use client';

import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useProposal } from '@/features/proposals';
import type { CreateProposalInput } from '@/features/proposals';
import type { ProposalCategory } from '@/features/proposals';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
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
      <PageContainer width="narrow" className="text-center py-16">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('signInTitle')}</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{t('signInDescription')}</p>
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
      <PageContainer width="narrow" className="text-center py-16">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('memberOnlyTitle')}</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{t('memberOnlyDescription')}</p>
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
      {/* Compact header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToProposals')}
        </Link>
        <div className="h-4 w-px bg-gray-300" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {editId ? t('editTitle') : t('title')}
          </h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      {/* Wizard */}
      <ProposalWizard
        initialData={initialData}
        proposalId={editId || undefined}
        onSuccess={(id) => router.push(`/proposals/${id}`)}
      />
    </PageContainer>
  );
}
