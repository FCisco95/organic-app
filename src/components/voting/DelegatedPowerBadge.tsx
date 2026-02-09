'use client';

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Voting.delegation');
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
          {t('effectivePower', { total: formatVotingWeight(power.total_weight) })}
        </span>
        <span className="text-blue-500 text-xs ml-1">
          ({t('ownPower', { own: formatVotingWeight(power.own_weight) })} +{' '}
          {t('delegatedPower', {
            delegated: formatVotingWeight(power.delegated_weight),
            count: power.delegator_count,
          })})
        </span>
      </div>
    </div>
  );
}
