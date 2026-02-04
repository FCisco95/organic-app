'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';

import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  ListTodo,
  Edit2,
  Trash2,
  Save,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { ProposalWithVoting, getVotingStatus } from '@/features/voting';
import { VotingPanel, VoteResults, AdminVotingControls } from '@/components/voting';
import { PageContainer } from '@/components/layout';

type Proposal = ProposalWithVoting;

type Comment = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
  user_profiles: {
    organic_id: number | null;
    email: string;
  };
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const t = useTranslations('ProposalDetail');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const proposalId = params.id as string;
  const isAuthor = user && proposal && user.id === proposal.created_by;
  const isAdmin = profile?.role && ['admin', 'council'].includes(profile.role);

  const loadProposal = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('proposals')
        .select(
          `
          *,
          user_profiles!proposals_created_by_fkey (
            organic_id,
            email,
            wallet_pubkey
          )
        `
        )
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      setProposal(data as unknown as Proposal);
      setEditForm({ title: data.title, body: data.body });
    } catch (error) {
      console.error('Error loading proposal:', error);
      toast.error(t('toastLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [proposalId, t]);

  const loadComments = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          user_profiles!comments_user_id_fkey (
            organic_id,
            email
          )
        `
        )
        .eq('subject_type', 'proposal')
        .eq('subject_id', proposalId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as unknown as Comment[]);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [proposalId]);

  useEffect(() => {
    loadProposal();
    loadComments();
  }, [loadProposal, loadComments]);

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
      setSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase.from('comments').insert({
        subject_type: 'proposal',
        subject_id: proposalId,
        user_id: user.id,
        body: commentText.trim(),
      });

      if (error) throw error;

      setCommentText('');
      toast.success(t('toastCommentPosted'));
      loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error(t('toastCommentFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateProposalStatus(newStatus: 'approved' | 'rejected' | 'voting') {
    if (!isAdmin) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('proposals')
        .update({ status: newStatus })
        .eq('id', proposalId);

      if (error) throw error;

      toast.success(t('toastStatusUpdated', { status: getStatusLabel(newStatus) }));
      loadProposal();
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error(t('toastUpdateFailed'));
    }
  }

  async function createTaskFromProposal() {
    if (!isAdmin || !proposal) return;

    try {
      const supabase = createClient();

      const { data: task, error } = await supabase
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
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(t('toastTaskCreateFailed'));
    }
  }

  async function handleSaveEdit() {
    if (!editForm.title.trim() || !editForm.body.trim()) {
      toast.error(t('toastTitleBodyRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('proposals')
        .update({
          title: editForm.title.trim(),
          body: editForm.body.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId)
        .select(
          `
          *,
          user_profiles!proposals_created_by_fkey (
            organic_id,
            email
          )
        `
        )
        .single();

      if (error) throw error;

      setProposal(data as unknown as Proposal);
      setIsEditing(false);
      toast.success(t('toastUpdated'));
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error(t('toastUpdateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      const supabase = createClient();

      const { error } = await supabase.from('proposals').delete().eq('id', proposalId);

      if (error) throw error;

      toast.success(t('toastDeleted'));
      router.push('/proposals');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error(t('toastDeleteFailed'));
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { color: 'bg-gray-100 text-gray-700', icon: Clock };
      case 'submitted':
        return { color: 'bg-blue-100 text-blue-700', icon: Clock };
      case 'approved':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'rejected':
        return { color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'voting':
        return { color: 'bg-purple-100 text-purple-700', icon: MessageCircle };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t('statusDraft');
      case 'submitted':
        return t('statusSubmitted');
      case 'approved':
        return t('statusApproved');
      case 'rejected':
        return t('statusRejected');
      case 'voting':
        return t('statusVoting');
      default:
        return status;
    }
  };

  if (loading) {
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

  const statusConfig = getStatusConfig(proposal.status);
  const StatusIcon = statusConfig.icon;

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

      {/* Proposal Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {isEditing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="text-3xl font-bold text-gray-900 flex-1 border-b-2 border-organic-orange focus:outline-none"
              placeholder={t('titlePlaceholder')}
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 flex-1">{proposal.title}</h1>
          )}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}
            >
              <StatusIcon className="w-4 h-4" />
              <span className="capitalize">{getStatusLabel(proposal.status)}</span>
            </div>
            {(isAuthor || isAdmin) && !isEditing && proposal.status === 'draft' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  {t('edit')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('delete')}
                </button>
              </div>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={submitting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? t('saving') : t('save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ title: proposal.title, body: proposal.body });
                  }}
                  disabled={submitting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {t('cancel')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>
              {proposal.user_profiles.organic_id
                ? t('organicId', { id: proposal.user_profiles.organic_id })
                : proposal.user_profiles.email.split('@')[0]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{t('commentsCount', { count: comments.length })}</span>
          </div>
        </div>

        {/* Body */}
        <div className="prose max-w-none">
          {isEditing ? (
            <textarea
              value={editForm.body}
              onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
              rows={12}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none text-gray-700"
              placeholder={t('bodyPlaceholder')}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{proposal.body}</p>
          )}
        </div>

        {/* Admin Actions - Submitted Proposals */}
        {isAdmin && proposal.status === 'submitted' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('councilActions')}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateProposalStatus('approved')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {t('approve')}
              </button>
              <button
                onClick={() => updateProposalStatus('rejected')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {t('reject')}
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">{t('startVotingLabel')}</p>
              <AdminVotingControls
                proposal={proposal}
                onVotingStarted={loadProposal}
                onVotingFinalized={loadProposal}
              />
            </div>
          </div>
        )}

        {/* Admin Actions - Voting Proposals */}
        {isAdmin && proposal.status === 'voting' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('councilActions')}</p>
            <AdminVotingControls
              proposal={proposal}
              onVotingStarted={loadProposal}
              onVotingFinalized={loadProposal}
            />
          </div>
        )}

        {/* Create Task from Proposal */}
        {isAdmin && proposal.status === 'approved' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('implementation')}</p>
            <button
              onClick={createTaskFromProposal}
              className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              <ListTodo className="w-4 h-4" />
              {t('createTask')}
            </button>
            <p className="text-xs text-gray-500 mt-2">{t('createTaskHelp')}</p>
          </div>
        )}
      </div>

      {/* Voting Panel - Show during voting */}
      {proposal.status === 'voting' && (
        <div className="mb-6">
          <VotingPanel proposal={proposal} />
        </div>
      )}

      {/* Vote Results - Show after voting has ended with a result */}
      {proposal.result && (
        <div className="mb-6">
          <VoteResults proposal={proposal} />
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none mb-3"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('posting') : t('postComment')}
            </button>
          </form>
        ) : (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
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
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noComments')}</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-l-4 border-organic-orange/20 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {comment.user_profiles.organic_id
                      ? t('organicId', { id: comment.user_profiles.organic_id })
                      : comment.user_profiles.email.split('@')[0]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
