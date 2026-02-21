'use client';

import { useTranslations } from 'next-intl';
import type { RewardDistribution } from '@/features/rewards';

interface DistributionsTableProps {
  distributions: RewardDistribution[];
  showUser?: boolean;
}

export function DistributionsTable({
  distributions,
  showUser = false,
}: DistributionsTableProps) {
  const t = useTranslations('Rewards');

  if (distributions.length === 0) {
    return (
      <div className="py-10 text-center" data-testid="rewards-distributions-empty">
        <p className="text-sm text-gray-500">{t('distributions.empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="rewards-distributions-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {showUser && (
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                {t('distributions.user')}
              </th>
            )}
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.type')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.category')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.settlement')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.integrity')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.tokens')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.reason')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              {t('distributions.date')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {distributions.map((dist) => {
            const settlementRisk =
              dist.reward_settlement_status === 'held' ||
              dist.reward_settlement_status === 'killed';
            const integrityHold = Boolean(dist.integrity_hold) || settlementRisk;

            return (
              <tr
                key={dist.id}
                className="transition-colors hover:bg-gray-50"
                data-testid={`rewards-distribution-row-${dist.id}`}
              >
                {showUser && (
                  <td className="px-4 py-3 text-gray-900">
                    {dist.user_name || dist.user_id.slice(0, 8)}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {t(`distributionType.${dist.type}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {dist.category ? t(`distributionCategory.${dist.category}`) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {dist.type === 'epoch' && dist.reward_settlement_status ? (
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          settlementRisk
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {t(`overview.settlementStatus.${dist.reward_settlement_status}`)}
                      </span>
                      {dist.reward_settlement_reason && (
                        <p className="max-w-[220px] truncate text-xs text-amber-700">
                          {dist.reward_settlement_reason}
                        </p>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3" data-testid="rewards-admin-distribution-integrity-badge">
                  {integrityHold ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {t('distributions.integrityHold')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {t('distributions.integrityClean')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {Number(dist.token_amount).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  ORG
                </td>
                <td className="max-w-[220px] px-4 py-3 text-gray-500">
                  <p className="truncate">{dist.reason || '—'}</p>
                  {dist.integrity_reason && (
                    <p className="mt-1 truncate text-xs text-red-600">{dist.integrity_reason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(dist.created_at).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
