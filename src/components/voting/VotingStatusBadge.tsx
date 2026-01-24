'use client';

import { Clock, CheckCircle, XCircle, AlertCircle, Vote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { VotingStatus, ProposalWithVoting, getVotingStatus } from '@/features/voting';

interface VotingStatusBadgeProps {
  proposal: ProposalWithVoting;
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<VotingStatus, { color: string; icon: typeof Clock; labelKey: string }> =
  {
    not_started: {
      color: 'bg-gray-100 text-gray-700',
      icon: Clock,
      labelKey: 'notStarted',
    },
    voting_open: {
      color: 'bg-purple-100 text-purple-700',
      icon: Vote,
      labelKey: 'votingOpen',
    },
    voting_closed: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: AlertCircle,
      labelKey: 'votingClosed',
    },
    finalized_passed: {
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
      labelKey: 'passed',
    },
    finalized_failed: {
      color: 'bg-red-100 text-red-700',
      icon: XCircle,
      labelKey: 'failed',
    },
    finalized_quorum_not_met: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: AlertCircle,
      labelKey: 'quorumNotMet',
    },
  };

export function VotingStatusBadge({
  proposal,
  showIcon = true,
  className = '',
}: VotingStatusBadgeProps) {
  const t = useTranslations('Voting');
  const status = getVotingStatus(proposal);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.color} ${className}`}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      <span>{t(`status.${config.labelKey}`)}</span>
    </div>
  );
}
