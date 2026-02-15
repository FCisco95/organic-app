'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import {
  useProposal,
  useProposalComments,
  useDeleteProposal,
  useUpdateProposalStatus,
  useAddComment,
} from '@/features/proposals';
import type { ProposalStatus, ProposalCategory } from '@/features/proposals';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageCircle,
  CheckCircle,
  XCircle,
  ListTodo,
  Edit2,
  Trash2,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import type { ProposalWithVoting } from '@/features/voting';
import { FollowButton } from '@/components/notifications/follow-button';
import { PageContainer } from '@/components/layout';
import { StatusBadge, CategoryBadge, ProposalSections } from '@/components/proposals';

const VotingPanel = dynamic(
  () => import('@/components/voting').then((mod) => mod.VotingPanel),
  { loading: () => <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const VoteResults = dynamic(
  () => import('@/components/voting').then((mod) => mod.VoteResults),
  { loading: () => <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" /> }
);
const AdminVotingControls = dynamic(
  () => import('@/components/voting').then((mod) => mod.AdminVotingControls),
  { loading: () => <div className="h-20 rounded-lg bg-gray-100 animate-pulse" /> }
);
const DelegatedPowerBadge = dynamic(
  () =>
    import('@/components/voting/DelegatedPowerBadge').then((mod) => mod.DelegatedPowerBadge),
  { loading: () => <div className="h-12 rounded-lg bg-gray-100 animate-pulse" /> }
);
const DelegationPanel = dynamic(
  () => import('@/components/voting/DelegationPanel').then((mod) => mod.DelegationPanel),
  { loading: () => <div className="h-40 rounded-lg bg-gray-100 animate-pulse" /> }
);
const DelegationInfo = dynamic(
  () => import('@/components/voting/DelegationInfo').then((mod) => mod.DelegationInfo),
  { loading: () => <div className="h-24 rounded-lg bg-gray-100 animate-pulse" /> }
);

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const t = useTranslations('ProposalDetail');
  const [commentText, setCommentText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const proposalId = params.id as string;

  const { data: proposal, isLoading, refetch: refetchProposal } = useProposal(proposalId);
  const { data: comments = [], refetch: refetchComments } = useProposalComments(proposalId);

  const deleteProposal = useDeleteProposal();
  const updateStatus = useUpdateProposalStatus();
  const addComment = useAddComment();

  const isAuthor = user && proposal && user.id === proposal.created_by;
  const isAdmin = profile?.role && ['admin', 'council'].includes(profile.role);

  // Suppress unused var warning — refetchComments kept for future use
  void refetchComments;

  const category = (proposal?.category as ProposalCategory) || 'feature';

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error(t('toastSignInToComment'));
      return;
    }

    if (!commentText.trim()) {
      toast.error(t('toastCommentEmpty'));
      return;
    }

    try {
      await addComment.mutateAsync({ proposalId, body: commentText.trim() });
      setCommentText('');
      toast.success(t('toastCommentPosted'));
    } catch {
      toast.error(t('toastCommentFailed'));
    }
  }

  async function handleStatusChange(newStatus: 'approved' | 'rejected' | 'voting') {
    if (!isAdmin) return;

    try {
      await updateStatus.mutateAsync({ proposalId, status: newStatus });
      toast.success(t('toastStatusUpdated', { status: newStatus }));
      refetchProposal();
    } catch {
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function createTaskFromProposal() {
    if (!isAdmin || !proposal) return;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: proposal.title,
          description: proposal.body,
          proposal_id: proposal.id,
          status: 'backlog',
          priority: 'medium',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('toastTaskCreated'));
      router.push('/tasks');
    } catch {
      toast.error(t('toastTaskCreateFailed'));
    }
  }

  async function handleDelete() {
    try {
      await deleteProposal.mutateAsync(proposalId);
      toast.success(t('toastDeleted'));
      router.push('/proposals');
    } catch {
      toast.error(t('toastDeleteFailed'));
    }
  }

  if (isLoading) {
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

  if (!proposal) {
    return (
      <PageContainer width="narrow" className="text-center py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('notFoundTitle')}</h1>
        <Link
          href="/proposals"
          className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {t('backToProposals')}
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      {/* Back Link */}
      <Link
        href="/proposals"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('backToProposals')}
      </Link>

      {/* Proposal Header + Content */}
      <div className="bg-white rounded-2xl overflow-hidden mb-6">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          {/* Badges Row */}
          <div className="flex items-center gap-2 mb-4">
            <CategoryBadge category={category} size="md" />
            <StatusBadge status={proposal.status as ProposalStatus} />
          </div>

          {/* Title + Actions */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900 flex-1">{proposal.title}</h1>
            <div className="flex gap-2 shrink-0">
              {user && <FollowButton subjectType="proposal" subjectId={proposalId} />}
              {(isAuthor || isAdmin) && proposal.status === 'draft' && (
                <>
                  <Link
                    href={`/proposals/new?edit=${proposal.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/80 hover:bg-white text-gray-700 rounded-lg transition-colors ring-1 ring-gray-200"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t('edit')}
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors ring-1 ring-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Meta Info Pills */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white/60 rounded-full px-3 py-1">
              <User className="w-3.5 h-3.5" />
              <span>
                {proposal.user_profiles.organic_id
                  ? t('organicId', { id: proposal.user_profiles.organic_id })
                  : proposal.user_profiles.email.split('@')[0]}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white/60 rounded-full px-3 py-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatDistanceToNow(new Date(proposal.created_at!), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white/60 rounded-full px-3 py-1">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t('commentsCount', { count: comments.length })}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 py-6">
          {/* Structured Sections */}
          <ProposalSections proposal={proposal} />

          {/* Admin Actions - Submitted Proposals */}
          {isAdmin && proposal.status === 'submitted' && (
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">{t('councilActions')}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleStatusChange('approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('approve')}
                </button>
                <button
                  onClick={() => handleStatusChange('rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {t('reject')}
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-amber-200/60">
                <p className="text-sm font-medium text-amber-800 mb-3">{t('startVotingLabel')}</p>
                <AdminVotingControls
                  proposal={proposal as unknown as ProposalWithVoting}
                  onVotingStarted={() => refetchProposal()}
                  onVotingFinalized={() => refetchProposal()}
                />
              </div>
            </div>
          )}

          {/* Admin Actions - Voting Proposals */}
          {isAdmin && proposal.status === 'voting' && (
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">{t('councilActions')}</p>
              </div>
              <AdminVotingControls
                proposal={proposal as unknown as ProposalWithVoting}
                onVotingStarted={() => refetchProposal()}
                onVotingFinalized={() => refetchProposal()}
              />
            </div>
          )}

          {/* Create Task from Proposal */}
          {isAdmin && proposal.status === 'approved' && (
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">{t('implementation')}</p>
              </div>
              <button
                onClick={createTaskFromProposal}
                className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                <ListTodo className="w-4 h-4" />
                {t('createTask')}
              </button>
              <p className="text-xs text-amber-700 mt-2">{t('createTaskHelp')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Voting Panel - Show during voting */}
      {proposal.status === 'voting' && (
        <div className="mb-6 space-y-4">
          {user && (
            <DelegatedPowerBadge proposalId={proposalId} userId={user.id} />
          )}
          <VotingPanel proposal={proposal as unknown as ProposalWithVoting} />
          {user && <DelegationInfo />}
        </div>
      )}

      {/* Vote Results - Show after voting has ended with a result */}
      {proposal.result && (
        <div className="mb-6">
          <VoteResults proposal={proposal as unknown as ProposalWithVoting} />
        </div>
      )}

      {/* Delegation Panel - Manage vote delegations */}
      {user && (proposal.status === 'voting' || proposal.status === 'submitted') && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-6 mb-6">
          <DelegationPanel />
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {t('commentsTitle', { count: comments.length })}
        </h2>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('commentPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none mb-3 bg-gray-50/50"
            />
            <button
              type="submit"
              disabled={addComment.isPending || !commentText.trim()}
              className="px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addComment.isPending ? t('posting') : t('postComment')}
            </button>
          </form>
        ) : (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-gray-600 mb-3">{t('signInToJoin')}</p>
            <Link
              href="/login"
              className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {t('signIn')}
            </Link>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noComments')}</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-organic-orange/60" />
                  <span className="font-medium text-gray-900 text-sm">
                    {comment.user_profiles.organic_id
                      ? t('organicId', { id: comment.user_profiles.organic_id })
                      : comment.user_profiles.email.split('@')[0]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap pl-4">{comment.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('deleteTitle')}</h3>
            <p className="text-gray-600 mb-6">{t('deleteDescription')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDelete();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('deleteProposal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
