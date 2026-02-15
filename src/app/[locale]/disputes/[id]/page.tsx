'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { useDispute, useDisputeComments, useAddDisputeComment } from '@/features/disputes/hooks';
import { PageContainer } from '@/components/layout';
import { DisputeDetail } from '@/components/disputes/DisputeDetail';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { DisputeWithRelations } from '@/features/disputes/types';

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const t = useTranslations('Disputes');
  const td = useTranslations('Disputes.detail');
  const { data, isLoading, refetch } = useDispute(id);
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
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </PageContainer>
    );
  }

  if (!dispute) {
    return (
      <PageContainer>
        <div className="text-center py-20">
          <p className="text-gray-500">Dispute not found</p>
          <Link href="/disputes" className="text-orange-600 hover:underline mt-2 inline-block">
            Back to disputes
          </Link>
        </div>
      </PageContainer>
    );
  }

  // Check if current user is a party (for showing comments)
  const isParty =
    user?.id === dispute.disputant_id ||
    user?.id === dispute.reviewer_id ||
    user?.id === dispute.arbitrator_id ||
    profile?.role === 'admin';

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href="/disputes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('pageTitle')}
      </Link>

      {/* Dispute detail */}
      <DisputeDetail
        dispute={dispute}
        currentUserId={user?.id ?? ''}
        currentUserRole={profile?.role ?? 'guest'}
        onRefresh={() => refetch()}
      />

      {/* Comments section */}
      {isParty && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {td('comments')}
          </h3>

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    {comment.user?.avatar_url && (
                      <AvatarImage src={comment.user.avatar_url} />
                    )}
                    <AvatarFallback className="text-[10px] bg-gray-200">
                      {(comment.user?.name || comment.user?.email || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-gray-900">
                        {comment.user?.name ||
                          (comment.user?.organic_id
                            ? `ORG-${comment.user.organic_id}`
                            : comment.user?.email?.split('@')[0])}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={td('addComment')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button
              onClick={handleAddComment}
              disabled={!commentText.trim() || addComment.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                td('addComment')
              )}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
