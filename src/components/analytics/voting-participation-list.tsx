'use client';

import { useTranslations } from 'next-intl';
import { ChartCard } from './chart-card';
import type { VotingParticipationData } from '@/features/analytics';

interface VotingParticipationListProps {
  data: VotingParticipationData[] | undefined;
  loading: boolean;
}

export function VotingParticipationList({ data, loading }: VotingParticipationListProps) {
  const t = useTranslations('Analytics');

  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard title={t('charts.votingParticipation')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('empty')}</p>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto">
          {data?.map((item) => {
            const total = item.yes_votes + item.no_votes + item.abstain_votes;
            const yesPercent = total > 0 ? (item.yes_votes / total) * 100 : 0;

            return (
              <div
                key={item.proposal_id}
                className="rounded-lg border border-gray-100 p-3"
              >
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.proposal_title}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    {t('charts.votes', { count: item.vote_count })}
                  </span>
                  <span className="text-green-600">
                    {t('charts.yes')} {item.yes_votes}
                  </span>
                  <span className="text-red-500">
                    {t('charts.no')} {item.no_votes}
                  </span>
                  <span className="text-gray-400">
                    {t('charts.abstain')} {item.abstain_votes}
                  </span>
                </div>
                {/* Simple bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${yesPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
