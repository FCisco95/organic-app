'use client';

import { ArrowRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDelegations, DELEGATION_CATEGORY_LABELS } from '@/features/voting';

interface DelegationInfoProps {
  className?: string;
}

export function DelegationInfo({ className }: DelegationInfoProps) {
  const { data } = useDelegations();

  const outgoing = data?.outgoing ?? [];
  const incoming = data?.incoming ?? [];

  if (outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div className={cn('text-xs space-y-1', className)}>
      {outgoing.map((del) => (
        <div key={del.id} className="flex items-center gap-1 text-gray-500">
          <Shield className="w-3 h-3" />
          <span>You delegated</span>
          {del.category ? (
            <span className="font-medium">{DELEGATION_CATEGORY_LABELS[del.category]}</span>
          ) : (
            <span className="font-medium">all</span>
          )}
          <span>votes</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-medium text-gray-700">
            {del.delegate?.name || del.delegate?.email || 'Unknown'}
          </span>
        </div>
      ))}
      {incoming.map((del) => (
        <div key={del.id} className="flex items-center gap-1 text-green-600">
          <Shield className="w-3 h-3" />
          <span className="font-medium">
            {del.delegator?.name || del.delegator?.email || 'Unknown'}
          </span>
          <span>delegated</span>
          {del.category ? (
            <span className="font-medium">{DELEGATION_CATEGORY_LABELS[del.category]}</span>
          ) : (
            <span className="font-medium">all</span>
          )}
          <span>votes to you</span>
        </div>
      ))}
    </div>
  );
}
