'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import {
  useProposal,
  useProposalComments,
  useDeleteProposal,
  useUpdateProposalStatus,
  useAddComment,
  normalizeProposalStatus,
} from '@/features/proposals';
import type { ProposalStatus, ProposalCategory } from '@/features/proposals';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageCircle,
  CheckCircle,
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
import { createClient } from '@/lib/supabase/client';

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

type ProposalExecutionTask = {
  id: string;
  title: string;
  status: string | null;
  proposal_versions: {
    version_number: number;
  } | null;
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const t = useTranslations('ProposalDetail');
  const [commentText, setCommentText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [executionTasks, setExecutionTasks] = useState<ProposalExecutionTask[]>([]);
  const [isLoadingExecutionTasks, setIsLoadingExecutionTasks] = useState(false);

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
  const lifecycleStatus = normalizeProposalStatus((proposal?.status as ProposalStatus | null) ?? null);
  const currentVersionNumber =
    proposal?.proposal_versions?.version_number ?? proposal?.current_version_number ?? 1;
  const hasOutdatedComments = comments.some((comment) => {
    const commentVersion = comment.proposal_versions?.version_number ?? 1;
    return commentVersion < currentVersionNumber;
  });
  const canCreateExecutionTask =
    Boolean(isAdmin) && lifecycleStatus === 'finalized' && proposal?.result === 'passed';
  const statusLabelMap: Record<ProposalStatus, string> = {
    draft: t('statusDraft'),
    public: t('statusPublic'),
    qualified: t('statusQualified'),
    discussion: t('statusDiscussion'),
    voting: t('statusVoting'),
    finalized: t('statusFinalized'),
    canceled: t('statusCanceled'),
    submitted: t('statusSubmitted'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
  };

  const fetchExecutionTasks = useCallback(async () => {
    if (!proposalId) return;

    try {
      setIsLoadingExecutionTasks(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          id,
          title,
          status,
          proposal_versions!tasks_proposal_version_id_fkey(
            version_number
          )
        `
        )
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setExecutionTasks((data ?? []) as unknown as ProposalExecutionTask[]);
    } catch {
      setExecutionTasks([]);
    } finally {
      setIsLoadingExecutionTasks(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void fetchExecutionTasks();
  }, [fetchExecutionTasks]);

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

  async function handleStatusChange(
    newStatus: 'public' | 'qualified' | 'discussion' | 'voting' | 'finalized' | 'canceled'
  ) {
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
    if (!canCreateExecutionTask || !proposal) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proposal.title,
          description: proposal.body,
          task_type: 'custom',
          priority: 'medium',
          base_points: 0,
          proposal_id: proposal.id,
          proposal_version_id:
            proposal.proposal_versions?.id ?? proposal.current_version_id ?? undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        task?: { id: string };
      };

      if (!response.ok || !payload.task) {
        throw new Error(payload.error ?? 'Failed to create task');
      }

      toast.success(t('toastTaskCreated'));
      await fetchExecutionTasks();
      router.push(`/tasks/${payload.task.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toastTaskCreateFailed');
      toast.error(message);
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
    <PageContainer width="default">
      {/* Back Link */}
      <Link
        href="/proposals"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('backToProposals')}
      </Link>

      <div
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        data-testid="proposal-showcase"
      >
        <div className="min-w-0 space-y-6">
          {/* Proposal Header + Content */}
          <div className="bg-white rounded-2xl overflow-hidden" data-testid="proposal-header">
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
                  {(isAuthor || isAdmin) &&
                    ['draft', 'public', 'discussion'].includes(lifecycleStatus) && (
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

              {/* Admin Actions - Lifecycle Progression */}
              {isAdmin && (lifecycleStatus === 'public' || lifecycleStatus === 'qualified') && (
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">{t('councilActions')}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {lifecycleStatus === 'public' && (
                      <button
                        onClick={() => handleStatusChange('qualified')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('moveToQualified')}
                      </button>
                    )}
                    {lifecycleStatus === 'qualified' && (
                      <button
                        onClick={() => handleStatusChange('discussion')}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t('moveToDiscussion')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Actions - Voting Controls */}
              {isAdmin &&
                (proposal.status === 'voting' ||
                  proposal.status === 'submitted' ||
                  lifecycleStatus === 'public' ||
                  lifecycleStatus === 'qualified' ||
                  lifecycleStatus === 'discussion') && (
                  <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-800">{t('councilActions')}</p>
                    </div>
                    {lifecycleStatus === 'discussion' && (
                      <p className="text-sm text-amber-800 mb-3">{t('startVotingLabel')}</p>
                    )}
                    <AdminVotingControls
                      proposal={proposal as unknown as ProposalWithVoting}
                      onVotingStarted={() => refetchProposal()}
                      onVotingFinalized={() => refetchProposal()}
                    />
                  </div>
                )}

              {/* Create Task from Proposal */}
              {canCreateExecutionTask && (
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">{t('implementation')}</p>
                  </div>
                  <p className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 mb-3">
                    {t('taskProvenanceBadge', { version: currentVersionNumber })}
                  </p>
                  <button
                    onClick={createTaskFromProposal}
                    className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <ListTodo className="w-4 h-4" />
                    {t('createTask')}
                  </button>
                  <p className="text-xs text-amber-700 mt-2">{t('createTaskHelp')}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {t('taskProvenanceHelp', { version: currentVersionNumber })}
                  </p>
                </div>
              )}

              {(isLoadingExecutionTasks || executionTasks.length > 0) && (
                <div
                  className="mt-8 rounded-xl border border-gray-200 p-6 bg-white"
                  data-testid="proposal-task-list"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ListTodo className="w-5 h-5 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-800">{t('linkedTasksTitle')}</p>
                  </div>
                  {isLoadingExecutionTasks ? (
                    <p className="text-sm text-gray-500">{t('linkedTasksLoading')}</p>
                  ) : (
                    <div className="space-y-2">
                      {executionTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-sm font-medium text-organic-orange hover:text-orange-600"
                          >
                            {task.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                              {t('taskSourceVersion', {
                                version:
                                  task.proposal_versions?.version_number ?? currentVersionNumber,
                              })}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {(task.status ?? 'backlog').replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Voting Panel - Show during voting */}
          {proposal.status === 'voting' && (
            <div className="mb-6 space-y-4">
              {user && <DelegatedPowerBadge proposalId={proposalId} userId={user.id} />}
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

          {/* Comments Section */}
          <div
            className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/60 p-8"
            data-testid="proposal-comments"
          >
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

            {hasOutdatedComments && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t('updatedSinceComment', { version: currentVersionNumber })}
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('noComments')}</p>
              ) : (
                comments.map((comment) => {
                  const commentVersion = comment.proposal_versions?.version_number ?? 1;
                  const outdated = commentVersion < currentVersionNumber;

                  return (
                    <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-organic-orange/60" />
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.user_profiles.organic_id
                            ? t('organicId', { id: comment.user_profiles.organic_id })
                            : comment.user_profiles.email.split('@')[0]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {t('commentOnVersion', { version: commentVersion })}
                        </span>
                        {outdated && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {t('updatedMarker')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap pl-4">{comment.body}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <aside
          className="space-y-4 xl:sticky xl:top-24 self-start"
          data-testid="proposal-decision-rail"
        >
          <div
            className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-5"
            data-testid="proposal-vote-window"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              {t('decisionRailLabel')}
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{t('decisionRailTitle')}</h3>
            <p className="mt-1 text-sm text-slate-600">{t('decisionRailSubtitle')}</p>
            <div className="mt-4 space-y-3 rounded-xl border border-white/70 bg-white/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-slate-500">{t('railStatus')}</span>
                <StatusBadge status={proposal.status as ProposalStatus} showIcon={false} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-slate-500">{t('railCurrentState')}</span>
                <span className="text-sm font-semibold text-slate-800">
                  {statusLabelMap[proposal.status as ProposalStatus]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-slate-500">{t('railComments')}</span>
                <span className="text-sm font-semibold text-slate-800">
                  {t('commentsCount', { count: comments.length })}
                </span>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border border-slate-200 bg-white p-5"
            data-testid="proposal-version-context"
          >
            <h3 className="text-sm font-semibold text-slate-900">{t('versionContextTitle')}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {t('versionContextDescription', { version: currentVersionNumber })}
            </p>
            {hasOutdatedComments && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t('updatedSinceComment', { version: currentVersionNumber })}
              </p>
            )}
          </div>

          <div
            className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-slate-100"
            data-testid="proposal-provenance-callout"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t('governanceSource')}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{t('immutableProposalReference')}</h3>
            <p className="mt-2 text-sm text-slate-300">
              {t('taskProvenanceHelp', { version: currentVersionNumber })}
            </p>
          </div>

          {user &&
            (proposal.status === 'voting' ||
              proposal.status === 'submitted' ||
              lifecycleStatus === 'discussion') && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <DelegationPanel />
              </div>
            )}
        </aside>
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
