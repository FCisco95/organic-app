'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, MessageCircle, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  comments_count?: number;
};

export default function ProposalsPage() {
  const { user, profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadProposals();
  }, [filter]);

  async function loadProposals() {
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
        query = query.eq('status', filter);
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

      setProposals(proposalsWithCounts as Proposal[]);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  }

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

  const canCreateProposal = profile?.role && ['member', 'council', 'admin'].includes(profile.role);

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
            <p className="text-gray-600 mt-1">
              Submit ideas and vote on proposals for the Organic DAO
            </p>
          </div>

          {canCreateProposal && (
            <Link
              href="/proposals/new"
              className="flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Proposal
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
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No proposals found</p>
            {canCreateProposal && (
              <Link
                href="/proposals/new"
                className="inline-flex items-center gap-2 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Proposal
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 truncate">
                        {proposal.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          proposal.status
                        )}`}
                      >
                        {proposal.status}
                      </span>
                    </div>

                    <p className="text-gray-600 line-clamp-2 mb-4">
                      {proposal.body}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
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
                        <span>{proposal.comments_count || 0} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info Banner */}
        {!user && (
          <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Want to participate?
            </h3>
            <p className="text-gray-700 mb-4">
              Sign in and link your wallet to create proposals and vote on decisions.
            </p>
            <Link
              href="/login"
              className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
