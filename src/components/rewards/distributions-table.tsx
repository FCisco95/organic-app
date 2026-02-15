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
      <div className="text-center py-8">
        <p className="text-gray-500">{t('distributions.empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {showUser && (
              <th className="text-left py-3 px-4 font-medium text-gray-500">
                {t('distributions.user')}
              </th>
            )}
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('distributions.type')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('distributions.category')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('distributions.tokens')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('distributions.reason')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('distributions.date')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {distributions.map((dist) => (
            <tr key={dist.id} className="hover:bg-gray-50 transition-colors">
              {showUser && (
                <td className="py-3 px-4 text-gray-900">
                  {dist.user_name || dist.user_id.slice(0, 8)}
                </td>
              )}
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {t(`distributionType.${dist.type}`)}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-700">
                {dist.category ? t(`distributionCategory.${dist.category}`) : '—'}
              </td>
              <td className="py-3 px-4 text-gray-900 font-medium">
                {Number(dist.token_amount).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                ORG
              </td>
              <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">
                {dist.reason || '—'}
              </td>
              <td className="py-3 px-4 text-gray-500">
                {new Date(dist.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
