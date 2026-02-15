'use client';

import { useTranslations } from 'next-intl';
import { ClaimStatusBadge } from './claim-status-badge';
import type { RewardClaim } from '@/features/rewards';

interface ClaimsTableProps {
  claims: RewardClaim[];
  showUser?: boolean;
  onReview?: (claim: RewardClaim) => void;
  onPay?: (claim: RewardClaim) => void;
}

export function ClaimsTable({ claims, showUser = false, onReview, onPay }: ClaimsTableProps) {
  const t = useTranslations('Rewards');

  if (claims.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('claims.empty')}</p>
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
                {t('claims.user')}
              </th>
            )}
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('claims.points')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('claims.tokens')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('claims.status')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">
              {t('claims.date')}
            </th>
            {(onReview || onPay) && (
              <th className="text-right py-3 px-4 font-medium text-gray-500">
                {t('claims.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {claims.map((claim) => (
            <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
              {showUser && (
                <td className="py-3 px-4 text-gray-900">
                  {claim.user_name || claim.user_email || claim.user_id.slice(0, 8)}
                </td>
              )}
              <td className="py-3 px-4 text-gray-900 font-medium">
                {claim.points_amount.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-gray-700">
                {Number(claim.token_amount).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                ORG
              </td>
              <td className="py-3 px-4">
                <ClaimStatusBadge status={claim.status} />
              </td>
              <td className="py-3 px-4 text-gray-500">
                {new Date(claim.created_at).toLocaleDateString()}
              </td>
              {(onReview || onPay) && (
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onReview && claim.status === 'pending' && (
                      <button
                        onClick={() => onReview(claim)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        {t('claims.review')}
                      </button>
                    )}
                    {onPay && claim.status === 'approved' && (
                      <button
                        onClick={() => onPay(claim)}
                        className="text-xs font-medium text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        {t('claims.markPaid')}
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
