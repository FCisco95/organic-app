'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useDelegations, DELEGATION_CATEGORY_LABELS } from '@/features/voting';

interface DelegationInfoProps {
  className?: string;
}

export function DelegationInfo({ className }: DelegationInfoProps) {
  const t = useTranslations('Voting.delegation');
  const { data } = useDelegations();

  const outgoing = data?.outgoing ?? [];
  const incoming = data?.incoming ?? [];

  if (outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div className={cn('text-xs space-y-1', className)}>
      {outgoing.map((del) => (
        <div key={del.id} className="flex items-center gap-1 text-gray-500">
          <Shield className="w-3 h-3" />
          <span>
            {t('outgoingText', {
              category: del.category
                ? DELEGATION_CATEGORY_LABELS[del.category]
                : t('allVotes'),
              name: del.delegate?.name || del.delegate?.email || 'Unknown',
            })}
          </span>
        </div>
      ))}
      {incoming.map((del) => (
        <div key={del.id} className="flex items-center gap-1 text-green-600">
          <Shield className="w-3 h-3" />
          <span>
            {t('incomingText', {
              category: del.category
                ? DELEGATION_CATEGORY_LABELS[del.category]
                : t('allVotes'),
              name: del.delegator?.name || del.delegator?.email || 'Unknown',
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
