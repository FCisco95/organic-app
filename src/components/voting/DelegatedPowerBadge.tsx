'use client';

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectiveVotingPower, formatVotingWeight } from '@/features/voting';

interface DelegatedPowerBadgeProps {
  proposalId: string;
  userId: string | undefined;
  className?: string;
}

export function DelegatedPowerBadge({
  proposalId,
  userId,
  className,
}: DelegatedPowerBadgeProps) {
  const { data: power } = useEffectiveVotingPower(proposalId, userId);

  if (!power || power.delegated_weight === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-blue-50 border border-blue-200 text-blue-700 text-sm',
        className
      )}
    >
      <Users className="w-4 h-4 flex-shrink-0" />
      <div>
        <span className="font-medium">
          {formatVotingWeight(power.total_weight)} $ORG
        </span>
        <span className="text-blue-500 text-xs ml-1">
          ({formatVotingWeight(power.own_weight)} own +{' '}
          {formatVotingWeight(power.delegated_weight)} delegated from{' '}
          {power.delegator_count} member{power.delegator_count > 1 ? 's' : ''})
        </span>
      </div>
    </div>
  );
}
