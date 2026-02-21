'use client';

import { useTranslations } from 'next-intl';
import { ClaimStatusBadge } from './claim-status-badge';
import type { ClaimQueueRisk, RewardClaim } from '@/features/rewards';

interface ClaimsTableProps {
  claims: RewardClaim[];
  showUser?: boolean;
  showRiskSignals?: boolean;
  onReview?: (claim: RewardClaim) => void;
  onPay?: (claim: RewardClaim) => void;
}

function getQueueAgeHours(createdAt: string): number {
  const createdMs = new Date(createdAt).getTime();
  return Math.max(0, Math.floor((Date.now() - createdMs) / (1000 * 60 * 60)));
}

function getQueueRisk(claim: RewardClaim): ClaimQueueRisk {
  if (claim.queue_risk) return claim.queue_risk;
  if (claim.status !== 'pending') return 'none';

  const ageHours = claim.age_hours ?? getQueueAgeHours(claim.created_at);
  if (ageHours >= 72) return 'urgent';
  if (ageHours >= 48) return 'watch';
  return 'none';
}

export function ClaimsTable({
  claims,
  showUser = false,
  showRiskSignals = false,
  onReview,
  onPay,
}: ClaimsTableProps) {
  const t = useTranslations('Rewards');

  if (claims.length === 0) {
    return (
      <div className="py-10 text-center" data-testid="rewards-claims-empty">
        <p className="text-sm text-gray-500">{t('claims.empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="rewards-claims-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {showUser && (
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.user')}</th>
            )}
            <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.points')}</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.tokens')}</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.status')}</th>
            {showRiskSignals && (
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.queueAge')}</th>
            )}
            {showRiskSignals && (
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.risk')}</th>
            )}
            <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.date')}</th>
            {(onReview || onPay) && (
              <th className="px-4 py-3 text-right font-medium text-gray-500">{t('claims.actions')}</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {claims.map((claim) => {
            const ageHours = claim.age_hours ?? getQueueAgeHours(claim.created_at);
            const risk = getQueueRisk(claim);

            return (
              <tr
                key={claim.id}
                className="transition-colors hover:bg-gray-50"
                data-testid={`rewards-claim-row-${claim.id}`}
              >
                {showUser && (
                  <td className="px-4 py-3 text-gray-900">
                    {claim.user_name || claim.user_email || claim.user_id.slice(0, 8)}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-gray-900">
                  {claim.points_amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {Number(claim.token_amount).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  ORG
                </td>
                <td className="px-4 py-3">
                  <ClaimStatusBadge status={claim.status} />
                </td>
                {showRiskSignals && (
                  <td className="px-4 py-3 text-gray-600">{t('claims.ageHours', { hours: ageHours })}</td>
                )}
                {showRiskSignals && (
                  <td className="px-4 py-3" data-testid={`rewards-claim-risk-${risk}`}>
                    {risk === 'urgent' && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t('claims.riskUrgent')}
                      </span>
                    )}
                    {risk === 'watch' && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {t('claims.riskWatch')}
                      </span>
                    )}
                    {risk === 'none' && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {t('claims.riskNone')}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-500">
                  {new Date(claim.created_at).toLocaleDateString()}
                </td>
                {(onReview || onPay) && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onReview && claim.status === 'pending' && (
                        <button
                          onClick={() => onReview(claim)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                          data-testid={`rewards-claim-review-${claim.id}`}
                        >
                          {t('claims.review')}
                        </button>
                      )}
                      {onPay && claim.status === 'approved' && (
                        <button
                          onClick={() => onPay(claim)}
                          className="rounded px-2 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 hover:text-green-800"
                          data-testid={`rewards-claim-pay-${claim.id}`}
                        >
                          {t('claims.markPaid')}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
