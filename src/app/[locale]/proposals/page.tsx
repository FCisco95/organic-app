'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';

import { createClient } from '@/lib/supabase/client';
import { Plus, MessageCircle, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProposalStatus } from '@/types/database';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';

type Proposal = {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'voting';
  created_by: string;
  created_at: string;
  updated_at: string;
  voting_ends_at?: string | null;
  user_profiles: {
    organic_id: number | null;
    email: string;
  };
  comments_count?: number;
};

export default function ProposalsPage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Proposals');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
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
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter as ProposalStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get comment counts for each proposal
      const proposalsWithCounts = await Promise.all(
        (data || []).map(async (proposal) => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('subject_type', 'proposal')
            .eq('subject_id', proposal.id);

          return {
            ...proposal,
            comments_count: count || 0,
          };
        })
      );

      setProposals(proposalsWithCounts as unknown as Proposal[]);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'voting':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

  const canCreateProposal = profile?.role && ['member', 'council', 'admin'].includes(profile.role);

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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'submitted', 'voting', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-organic-orange text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status === 'all' ? t('filterAll') : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : proposals.length === 0 ? (
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
          {proposals.map((proposal) => {
            const isVoting = proposal.status === 'voting';
            const votingEndsAt = proposal.voting_ends_at ? new Date(proposal.voting_ends_at) : null;
            const votingEndsLabel = votingEndsAt
              ? formatDistanceToNow(votingEndsAt, { addSuffix: true })
              : t('votingOpen');

            return (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className={`block rounded-lg border p-6 transition-shadow ${
                  isVoting
                    ? 'relative overflow-hidden border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50 hover:shadow-lg'
                    : 'bg-white border-gray-200 hover:shadow-md'
                }`}
              >
                {isVoting && (
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-orange-200/70 blur-2xl"></div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 truncate">
                        {proposal.title}
                      </h3>
                      {isVoting && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                          </span>
                          {t('liveVoting')}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          proposal.status
                        )}`}
                      >
                        {getStatusLabel(proposal.status)}
                      </span>
                    </div>

                    <p className="text-gray-600 line-clamp-2 mb-4">{proposal.body}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
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
                        <span>
                          {formatDistanceToNow(new Date(proposal.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{t('commentsCount', { count: proposal.comments_count || 0 })}</span>
                      </div>
                      {isVoting && (
                        <div className="flex items-center gap-1 font-semibold text-orange-700">
                          <Calendar className="w-4 h-4" />
                          <span>{t('votingEndsIn', { time: votingEndsLabel })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
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
