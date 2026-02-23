'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  ProposalWithVoting,
  ProposalResult,
  formatVotingWeight,
  useVoteResults,
} from '@/features/voting';

interface VoteResultsProps {
  proposal: ProposalWithVoting;
}

const RESULT_CONFIG: Record<
  ProposalResult,
  { color: string; bgColor: string; icon: typeof CheckCircle }
> = {
  passed: {
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  failed: {
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle,
  },
  quorum_not_met: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: AlertCircle,
  },
};

export function VoteResults({ proposal }: VoteResultsProps) {
  const t = useTranslations('Voting');
  const { data: results, isLoading } = useVoteResults(proposal.id);

  if (!proposal.result) return null;

  const config = RESULT_CONFIG[proposal.result];
  const Icon = config.icon;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-6 ${config.bgColor}`}>
      {/* Result Header */}
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-8 h-8 ${config.color}`} />
        <div>
          <h3 className={`text-xl font-bold ${config.color}`}>{t(`result.${proposal.result}`)}</h3>
          <p className="text-sm text-gray-600">{t('result.votingEnded')}</p>
        </div>
      </div>

      {results && (
        <>
          {/* Final Vote Breakdown */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700">{t('vote.yes')}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900">
                  {results.yes_percentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({formatVotingWeight(results.tally.yes_votes)} $ORG)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-700">{t('vote.no')}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900">
                  {results.no_percentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({formatVotingWeight(results.tally.no_votes)} $ORG)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-gray-700">{t('vote.abstain')}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900">
                  {results.abstain_percentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({formatVotingWeight(results.tally.abstain_votes)} $ORG)
                </span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="pt-4 border-t border-gray-300/50 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
            <div>
              <span className="text-gray-600">{t('stats.totalVoters')}</span>
              <p className="font-semibold text-gray-900">{results.tally.total_count}</p>
            </div>
            <div>
              <span className="text-gray-600">{t('stats.totalVotes')}</span>
              <p className="font-semibold text-gray-900">
                {formatVotingWeight(results.tally.total_votes)} $ORG
              </p>
            </div>
            <div>
              <span className="text-gray-600">{t('stats.participation')}</span>
              <p className="font-semibold text-gray-900">
                {results.participation_percentage.toFixed(2)}%
              </p>
            </div>
            <div>
              <span className="text-gray-600">{t('stats.quorum')}</span>
              <p
                className={`font-semibold ${results.quorum_met ? 'text-green-600' : 'text-yellow-600'}`}
              >
                {results.quorum_met ? t('stats.quorumMet') : t('stats.quorumNotMet')}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
