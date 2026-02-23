'use client';

import { useTranslations } from 'next-intl';
import type { RewardDistribution } from '@/features/rewards';

interface DistributionsTableProps {
  distributions: RewardDistribution[];
  showUser?: boolean;
  mobileVariant?: 'cards' | 'scroll';
}

export function DistributionsTable({
  distributions,
  showUser = false,
  mobileVariant = 'cards',
}: DistributionsTableProps) {
  const t = useTranslations('Rewards');
  const useCardsOnMobile = mobileVariant === 'cards';

  if (distributions.length === 0) {
    return (
      <div className="py-10 text-center" data-testid="rewards-distributions-empty">
        <p className="text-sm text-gray-500">{t('distributions.empty')}</p>
      </div>
    );
  }

  return (
    <div data-testid="rewards-distributions-table">
      {useCardsOnMobile ? (
        <div className="md:hidden divide-y divide-gray-100">
          {distributions.map((dist) => {
            const settlementRisk =
              dist.reward_settlement_status === 'held' ||
              dist.reward_settlement_status === 'killed';
            const integrityHold = Boolean(dist.integrity_hold) || settlementRisk;
            return (
              <article
                key={dist.id}
                className="p-4 space-y-3"
                data-testid={`rewards-distribution-row-${dist.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {showUser && (
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {dist.user_name || dist.user_id.slice(0, 8)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(dist.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {t(`distributionType.${dist.type}`)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">
                      {t('distributions.tokens')}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {Number(dist.token_amount).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}{' '}
                      ORG
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">
                      {t('distributions.category')}
                    </p>
                    <p className="font-medium text-gray-900 truncate">
                      {dist.category ? t(`distributionCategory.${dist.category}`) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {dist.type === 'epoch' && dist.reward_settlement_status
                      ? t(`overview.settlementStatus.${dist.reward_settlement_status}`)
                      : t('distributions.settlement')}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      integrityHold
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                    data-testid="rewards-admin-distribution-integrity-badge"
                  >
                    {integrityHold ? t('distributions.integrityHold') : t('distributions.integrityClean')}
                  </span>
                </div>

                {(dist.reason || dist.integrity_reason || dist.reward_settlement_reason) && (
                  <div className="space-y-1 text-xs text-gray-600">
                    {dist.reason && <p className="truncate">{dist.reason}</p>}
                    {dist.reward_settlement_reason && (
                      <p className="truncate text-amber-700">{dist.reward_settlement_reason}</p>
                    )}
                    {dist.integrity_reason && (
                      <p className="truncate text-red-600">{dist.integrity_reason}</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}

      <div className={useCardsOnMobile ? 'hidden md:block overflow-x-auto' : 'overflow-x-auto'}>
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
    </div>
  );
}
