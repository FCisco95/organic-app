'use client';

import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ListChecks } from 'lucide-react';
import { ClaimTimeline } from './claim-timeline';
import { ClaimStatusBadge } from './claim-status-badge';
import { timeAgo } from './time-ago';
import type { ClaimQueueRisk, RewardClaim } from '@/features/rewards';

interface ClaimsTableProps {
  claims: RewardClaim[];
  showUser?: boolean;
  showRiskSignals?: boolean;
  onReview?: (claim: RewardClaim) => void;
  onPay?: (claim: RewardClaim) => void;
  mobileVariant?: 'cards' | 'scroll';
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
  mobileVariant = 'cards',
}: ClaimsTableProps) {
  const t = useTranslations('Rewards');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const useCardsOnMobile = mobileVariant === 'cards';

  if (claims.length === 0) {
    return (
      <div className="py-12 text-center" data-testid="rewards-claims-empty">
        <ListChecks className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">{t('claims.empty')}</p>
        <p className="mt-1 text-xs text-gray-500">{t('claims.emptyHint')}</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div data-testid="rewards-claims-table">
      {/* Mobile cards */}
      {useCardsOnMobile ? (
        <div className="md:hidden divide-y divide-gray-100">
          {claims.map((claim) => {
            const ageHours = claim.age_hours ?? getQueueAgeHours(claim.created_at);
            const risk = getQueueRisk(claim);
            const isExpanded = expandedId === claim.id;
            return (
              <article
                key={claim.id}
                className="p-4 space-y-3"
                data-testid={`rewards-claim-row-${claim.id}`}
              >
                <button
                  onClick={() => toggleExpand(claim.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0 space-y-1">
                    {showUser && (
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {claim.user_name || claim.user_email || claim.user_id.slice(0, 8)}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {claim.points_amount.toLocaleString()} pts
                      </span>
                      <ClaimTimeline status={claim.status} />
                    </div>
                    <p
                      className="text-xs text-gray-500"
                      title={new Date(claim.created_at).toLocaleString()}
                    >
                      {timeAgo(claim.created_at)}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">
                          {t('claims.points')}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {claim.points_amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">
                          {t('claims.tokens')}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {Number(claim.token_amount).toLocaleString(undefined, {
                            maximumFractionDigits: 4,
                          })}{' '}
                          ORG
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ClaimStatusBadge status={claim.status} />
                      {showRiskSignals && (
                        <>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            {t('claims.ageHours', { hours: ageHours })}
                          </span>
                          {risk !== 'none' && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                risk === 'urgent'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                              data-testid={`rewards-claim-risk-${risk}`}
                            >
                              {risk === 'urgent' ? t('claims.riskUrgent') : t('claims.riskWatch')}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {(onReview || onPay) && (
                      <div className="flex flex-wrap gap-2">
                        {onReview && claim.status === 'pending' && (
                          <button
                            onClick={() => onReview(claim)}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            data-testid={`rewards-claim-review-${claim.id}`}
                          >
                            {t('claims.review')}
                          </button>
                        )}
                        {onPay && claim.status === 'approved' && (
                          <button
                            onClick={() => onPay(claim)}
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                            data-testid={`rewards-claim-pay-${claim.id}`}
                          >
                            {t('claims.markPaid')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}

      {/* Desktop table */}
      <div className={useCardsOnMobile ? 'hidden md:block overflow-x-auto' : 'overflow-x-auto'}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {showUser && (
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.user')}</th>
              )}
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.points')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.tokens')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.status')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('claims.timeline')}</th>
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
              const isExpanded = expandedId === claim.id;

              return (
                <Fragment key={claim.id}>
                  <tr
                    className={`transition-colors hover:bg-gray-50 ${
                      (onReview || onPay) ? 'cursor-pointer' : ''
                    } ${isExpanded ? 'bg-gray-50' : ''}`}
                    onClick={() => (onReview || onPay) && toggleExpand(claim.id)}
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
                    <td className="px-4 py-3">
                      <ClaimTimeline status={claim.status} />
                    </td>
                    {showRiskSignals && (
                      <td className="px-4 py-3" data-testid={`rewards-claim-risk-${risk}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">
                            {t('claims.ageHours', { hours: ageHours })}
                          </span>
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
                        </div>
                      </td>
                    )}
                    <td
                      className="px-4 py-3 text-gray-500"
                      title={new Date(claim.created_at).toLocaleString()}
                    >
                      {timeAgo(claim.created_at)}
                    </td>
                    {(onReview || onPay) && (
                      <td className="px-4 py-3 text-right">
                        <ChevronDown
                          className={`inline h-4 w-4 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </td>
                    )}
                  </tr>
                  {/* Expandable detail row */}
                  {isExpanded && (onReview || onPay) && (
                    <tr key={`${claim.id}-detail`} className="bg-gray-50/50">
                      <td
                        colSpan={
                          (showUser ? 1 : 0) +
                          4 +
                          (showRiskSignals ? 1 : 0) +
                          1 +
                          ((onReview || onPay) ? 1 : 0)
                        }
                        className="px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {claim.admin_note && (
                            <span className="text-xs text-gray-600">
                              {t('claims.adminNote')}: {claim.admin_note}
                            </span>
                          )}
                          {claim.wallet_address && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {claim.wallet_address.slice(0, 6)}...{claim.wallet_address.slice(-4)}
                            </span>
                          )}
                          <div className="ml-auto flex gap-2">
                            {onReview && claim.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReview(claim);
                                }}
                                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                                data-testid={`rewards-claim-review-${claim.id}`}
                              >
                                {t('claims.review')}
                              </button>
                            )}
                            {onPay && claim.status === 'approved' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPay(claim);
                                }}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                                data-testid={`rewards-claim-pay-${claim.id}`}
                              >
                                {t('claims.markPaid')}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
