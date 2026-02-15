'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDisputes } from '@/features/disputes/hooks';
import type { DisputeStatus } from '@/features/disputes/types';
import { DisputeCard } from './DisputeCard';
import { cn } from '@/lib/utils';

const STATUS_TABS: { key: string; statuses?: DisputeStatus }[] = [
  { key: 'all' },
  { key: 'open', statuses: 'open' },
  { key: 'under_review', statuses: 'under_review' },
  { key: 'resolved', statuses: 'resolved' },
  { key: 'dismissed', statuses: 'dismissed' },
];

interface DisputeQueueProps {
  myDisputes?: boolean;
}

export function DisputeQueue({ myDisputes = false }: DisputeQueueProps) {
  const t = useTranslations('Disputes');
  const [activeTab, setActiveTab] = useState('all');

  const selectedStatus = STATUS_TABS.find((tab) => tab.key === activeTab)?.statuses;

  const { data, isLoading } = useDisputes({
    status: selectedStatus,
    my_disputes: myDisputes || undefined,
  });

  const disputes = data?.data ?? [];

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.key === 'all'
              ? t('title')
              : t(`status.${tab.key}`)}
          </button>
        ))}
      </div>

      {/* Dispute list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">
            {myDisputes ? t('myDisputesEmpty') : t('queueEmpty')}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {myDisputes ? t('myDisputesEmptyHint') : t('queueEmptyHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <DisputeCard key={dispute.id} dispute={dispute} />
          ))}
        </div>
      )}
    </div>
  );
}
