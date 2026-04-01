'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useDispute, useDisputeComments, useAddDisputeComment } from '@/features/disputes/hooks';
import { PageContainer } from '@/components/layout';
import { DisputeDetail } from '@/components/disputes/dispute-detail-view';
import { Loader2, ArrowLeft, Info } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import type { DisputeWithRelations } from '@/features/disputes/types';
import { useParams } from 'next/navigation';

export default function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? '';
  const { user, profile } = useAuth();
  const t = useTranslations('Disputes');
  const td = useTranslations('Disputes.detail');
  const { data, isLoading, isError, error, refetch } = useDispute(id);
  const { data: commentsData, refetch: refetchComments } = useDisputeComments(id);
  const addComment = useAddDisputeComment();
  const [commentText, setCommentText] = useState('');

  const dispute = data?.data as DisputeWithRelations | undefined;
  const comments = commentsData?.data ?? [];

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync({
        disputeId: id,
        input: { content: commentText, visibility: 'parties_only' },
      });
      setCommentText('');
      refetchComments();
    } catch {
      // Handled by mutation
    }
  };

  if (isLoading) {
    return (
      <PageContainer layout="structured">
        <div data-testid="dispute-detail-page" className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer layout="structured">
        <div data-testid="dispute-detail-page" className="py-20 text-center">
          <p className="text-sm text-red-600">{(error as Error)?.message || td('loadFailed')}</p>
          <Link href="/disputes" className="mt-2 inline-block text-organic-terracotta hover:underline">
            {td('backToDisputes')}
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (!dispute) {
    return (
      <PageContainer layout="structured">
        <div data-testid="dispute-detail-page" className="py-20 text-center">
          <p className="text-gray-500">{td('notFound')}</p>
          <Link href="/disputes" className="mt-2 inline-block text-organic-terracotta hover:underline">
            {td('backToDisputes')}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isParty =
    user?.id === dispute.disputant_id ||
    user?.id === dispute.reviewer_id ||
    user?.id === dispute.arbitrator_id ||
    profile?.role === 'admin';

  return (
    <PageContainer layout="structured">
      <div data-testid="dispute-detail-page">
        {/* Back link */}
        <Link
          data-testid="dispute-detail-back-link"
          href="/disputes"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('pageTitle')}
        </Link>

        {/* Limited access banner for non-parties */}
        {!isParty && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-sm text-blue-800">{td('limitedAccess')}</p>
          </div>
        )}

        {/* Dispute detail — tabbed layout with comments integrated */}
        <DisputeDetail
          dispute={dispute}
          currentUserId={user?.id ?? ''}
          currentUserRole={profile?.role ?? 'guest'}
          onRefresh={() => refetch()}
          comments={comments}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onAddComment={handleAddComment}
          isAddingComment={addComment.isPending}
          isParty={isParty}
        />
      </div>
    </PageContainer>
  );
}
