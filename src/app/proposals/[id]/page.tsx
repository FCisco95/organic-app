'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Calendar, User, MessageCircle, CheckCircle, XCircle, Clock, ListTodo, Edit2, Trash2, Save } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

type Proposal = {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'voting';
  created_by: string;
  created_at: string;
  updated_at: string;
  user_profiles: {
    organic_id: number | null;
    email: string;
  };
};

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

  useEffect(() => {
    loadProposal();
    loadComments();
  }, [proposalId]);

  async function loadProposal() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('proposals')
        .select(
          `
          *,
          user_profiles!proposals_created_by_fkey (
            organic_id,
            email
          )
        `
        )
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      setProposal(data as Proposal);
      setEditForm({ title: data.title, body: data.body });
    } catch (error) {
      console.error('Error loading proposal:', error);
      toast.error('Failed to load proposal');
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
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
      setComments(data as Comment[]);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error('You must be signed in to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
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
      toast.success('Comment posted!');
      loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
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

      toast.success(`Proposal ${newStatus}`);
      loadProposal();
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal');
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

      toast.success('Task created from proposal!');
      router.push('/tasks');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  }

  async function handleSaveEdit() {
    if (!editForm.title.trim() || !editForm.body.trim()) {
      toast.error('Title and body are required');
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

      setProposal(data as Proposal);
      setIsEditing(false);
      toast.success('Proposal updated successfully');
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      const supabase = createClient();

      const { error } = await supabase.from('proposals').delete().eq('id', proposalId);

      if (error) throw error;

      toast.success('Proposal deleted successfully');
      router.push('/proposals');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!proposal) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proposal not found</h1>
          <Link
            href="/proposals"
            className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Proposals
          </Link>
        </div>
      </main>
    );
  }

  const statusConfig = getStatusConfig(proposal.status);
  const StatusIcon = statusConfig.icon;

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Proposals
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
                placeholder="Proposal title"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 flex-1">{proposal.title}</h1>
            )}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                <span className="capitalize">{proposal.status}</span>
              </div>
              {(isAuthor || isAdmin) && !isEditing && proposal.status === 'draft' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
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
                    {submitting ? 'Saving...' : 'Save'}
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
                    Cancel
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
                  ? `Organic #${proposal.user_profiles.organic_id}`
                  : proposal.user_profiles.email.split('@')[0]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} comments</span>
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
                placeholder="Proposal body"
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{proposal.body}</p>
            )}
          </div>

          {/* Admin Actions */}
          {isAdmin && proposal.status === 'submitted' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Council Actions:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => updateProposalStatus('approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => updateProposalStatus('voting')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Start Voting
                </button>
                <button
                  onClick={() => updateProposalStatus('rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Create Task from Proposal */}
          {isAdmin && proposal.status === 'approved' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Implementation:</p>
              <button
                onClick={createTaskFromProposal}
                className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                <ListTodo className="w-4 h-4" />
                Create Task from Proposal
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Convert this approved proposal into a task on the task board
              </p>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none mb-3"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-600 mb-3">Sign in to join the discussion</p>
              <Link
                href="/login"
                className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-l-4 border-organic-orange/20 pl-4 py-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {comment.user_profiles.organic_id
                        ? `Organic #${comment.user_profiles.organic_id}`
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
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Proposal</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this proposal? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDelete();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
