'use client';

import { useTranslations } from 'next-intl';
import { Coins, Clock, CheckCircle } from 'lucide-react';
import type { RewardsSummary } from '@/features/rewards';

interface RewardsSummaryCardsProps {
  summary: RewardsSummary;
}

export function RewardsSummaryCards({ summary }: RewardsSummaryCardsProps) {
  const t = useTranslations('Rewards');

  const cards = [
    {
      label: t('admin.totalDistributed'),
      value: `${Number(summary.total_distributed).toLocaleString(undefined, { maximumFractionDigits: 2 })} ORG`,
      icon: Coins,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t('admin.pendingClaims'),
      value: String(summary.pending_claims_count),
      subtext: `${Number(summary.pending_claims_tokens).toLocaleString(undefined, { maximumFractionDigits: 2 })} ORG`,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: t('admin.approvedClaims'),
      value: String(summary.approved_claims_count),
      subtext: `${Number(summary.approved_claims_tokens).toLocaleString(undefined, { maximumFractionDigits: 2 })} ORG`,
      icon: CheckCircle,
      color: 'text-blue-600 bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="rewards-admin-summary-cards">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-200 bg-white p-4"
          data-testid="rewards-admin-summary-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500">{card.label}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{card.value}</p>
          {card.subtext && <p className="text-xs text-gray-500 mt-0.5">{card.subtext}</p>}
        </div>
      ))}
    </div>
  );
}
