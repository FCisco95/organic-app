'use client';

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, MinusCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import toast from 'react-hot-toast';
import {
  ProposalWithVoting,
  VoteValue,
  getVotingStatus,
  formatVotingWeight,
  useVoteResults,
  useUserVote,
  useUserVotingWeight,
  useCastVote,
  useVotingTimeRemaining,
  formatTimeRemaining,
} from '@/features/voting';

interface VotingPanelProps {
  proposal: ProposalWithVoting;
}

const VOTE_OPTIONS: { value: VoteValue; icon: typeof CheckCircle; color: string }[] = [
  { value: 'yes', icon: CheckCircle, color: 'bg-green-500 hover:bg-green-600' },
  { value: 'no', icon: XCircle, color: 'bg-red-500 hover:bg-red-600' },
  { value: 'abstain', icon: MinusCircle, color: 'bg-gray-400 hover:bg-gray-500' },
];

export function VotingPanel({ proposal }: VotingPanelProps) {
  const t = useTranslations('Voting');
  const { user, profile } = useAuth();
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);

  const { data: results, isLoading: resultsLoading } = useVoteResults(proposal.id);
  const { data: userVote, isLoading: userVoteLoading } = useUserVote(proposal.id, user?.id);
  const { data: votingWeight } = useUserVotingWeight(
    proposal.id,
    profile?.wallet_pubkey || undefined
  );
  const { data: timeRemaining } = useVotingTimeRemaining(proposal.voting_ends_at);
  const castVoteMutation = useCastVote();

  const status = getVotingStatus(proposal);
  const isVotingOpen = status === 'voting_open';
  const canVote = isVotingOpen && (votingWeight || 0) > 0;

  const handleVote = async (value: VoteValue) => {
    if (!canVote) return;

    setSelectedVote(value);

    try {
      await castVoteMutation.mutateAsync({
        proposalId: proposal.id,
        input: { value },
      });

      toast.success(userVote ? t('toast.voteUpdated') : t('toast.voteCast'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.voteFailed'));
    } finally {
      setSelectedVote(null);
    }
  };

  if (resultsLoading || userVoteLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        {isVotingOpen && timeRemaining !== undefined && (
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <Clock className="w-4 h-4" />
            <span>{formatTimeRemaining(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Vote Buttons */}
      {isVotingOpen && (
        <div className="mb-6">
          {!user ? (
            <p className="text-sm text-gray-500 text-center py-4">{t('signInToVote')}</p>
          ) : !profile?.wallet_pubkey ? (
            <p className="text-sm text-gray-500 text-center py-4">{t('linkWalletToVote')}</p>
          ) : votingWeight === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">{t('noTokensAtSnapshot')}</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{t('yourVotingPower')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatVotingWeight(votingWeight || 0)} $ORG
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {VOTE_OPTIONS.map(({ value, icon: Icon, color }) => {
                  const isSelected = userVote?.value === value;
                  const isLoading = castVoteMutation.isPending && selectedVote === value;

                  return (
                    <button
                      key={value}
                      onClick={() => handleVote(value)}
                      disabled={castVoteMutation.isPending}
                      className={`
                        flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg
                        text-white font-medium transition-all
                        ${isSelected ? `${color} ring-2 ring-offset-2 ring-gray-400` : color}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                      <span className="text-sm">{t(`vote.${value}`)}</span>
                    </button>
                  );
                })}
              </div>

              {userVote && (
                <p className="text-sm text-gray-500 text-center mt-3">
                  {t('youVoted', { vote: t(`vote.${userVote.value}`) })}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Progress Bars */}
          <div className="space-y-3">
            {/* Yes */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{t('vote.yes')}</span>
                <span className="text-gray-900 font-medium">
                  {results.yes_percentage.toFixed(1)}% (
                  {formatVotingWeight(results.tally.yes_votes)})
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${results.yes_percentage}%` }}
                />
              </div>
            </div>

            {/* No */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{t('vote.no')}</span>
                <span className="text-gray-900 font-medium">
                  {results.no_percentage.toFixed(1)}% ({formatVotingWeight(results.tally.no_votes)})
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${results.no_percentage}%` }}
                />
              </div>
            </div>

            {/* Abstain */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{t('vote.abstain')}</span>
                <span className="text-gray-900 font-medium">
                  {results.abstain_percentage.toFixed(1)}% (
                  {formatVotingWeight(results.tally.abstain_votes)})
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 transition-all duration-500"
                  style={{ width: `${results.abstain_percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('stats.participation')}</span>
              <p className="font-semibold text-gray-900">
                {results.participation_percentage.toFixed(2)}%
              </p>
            </div>
            <div>
              <span className="text-gray-500">{t('stats.totalVoters')}</span>
              <p className="font-semibold text-gray-900">{results.tally.total_count}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('stats.quorum')}</span>
              <p
                className={`font-semibold ${results.quorum_met ? 'text-green-600' : 'text-yellow-600'}`}
              >
                {results.quorum_percentage.toFixed(2)}%
                {results.quorum_met
                  ? ' ✓'
                  : ` / ${proposal.quorum_required ? ((proposal.quorum_required / (proposal.total_circulating_supply || 1)) * 100).toFixed(0) : 5}%`}
              </p>
            </div>
            <div>
              <span className="text-gray-500">{t('stats.totalVotes')}</span>
              <p className="font-semibold text-gray-900">
                {formatVotingWeight(results.tally.total_votes)} $ORG
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
