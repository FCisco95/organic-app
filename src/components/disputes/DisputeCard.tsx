'use client';

import { Link } from '@/i18n/navigation';
import { Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { DisputeListItem } from '@/features/disputes/types';
import {
  getDisputeSlaUrgency,
  isReviewerResponseTracked,
} from '@/features/disputes/sla';
import { DisputeStatusBadge } from './DisputeStatusBadge';
import { DisputeTierBadge } from './DisputeTierBadge';
import { cn } from '@/lib/utils';

interface DisputeCardProps {
  dispute: DisputeListItem;
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'recently';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'recently';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function DisputeCard({ dispute }: DisputeCardProps) {
  const t = useTranslations('Disputes');
  const taskTitle = dispute.task?.title || t('detail.task');
  const displayName =
    dispute.disputant?.name ||
    (dispute.disputant?.organic_id
      ? `ORG-${dispute.disputant.organic_id}`
      : dispute.disputant?.email?.split('@')[0] || '');
  const reasonLabel =
    dispute.reason in {
      rejected_unfairly: true,
      low_quality_score: true,
      plagiarism_claim: true,
      reviewer_bias: true,
      other: true,
    }
      ? t(`reason.${dispute.reason}`)
      : dispute.reason;
  const tracksReviewerResponse = isReviewerResponseTracked(dispute.status);
  const slaUrgency = tracksReviewerResponse
    ? getDisputeSlaUrgency(dispute.response_deadline)
    : 'no_deadline';
  const isEscalationCandidate = slaUrgency === 'overdue' && dispute.tier !== 'admin';

  const urgencyChipClass: Record<typeof slaUrgency, string> = {
    overdue: 'bg-red-100 text-red-700 border-red-200',
    at_risk: 'bg-amber-100 text-amber-700 border-amber-200',
    on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    no_deadline: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const urgencyLabel =
    slaUrgency === 'overdue'
      ? t('triage.overdue')
      : slaUrgency === 'at_risk'
        ? t('triage.atRisk')
        : slaUrgency === 'on_track'
          ? t('triage.onTrack')
          : t('triage.noDeadline');

  return (
    <Link
      href={`/disputes/${dispute.id}`}
      data-testid={`dispute-card-${dispute.id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {taskTitle}
            </h3>
            <DisputeStatusBadge status={dispute.status} showIcon={false} />
            <DisputeTierBadge tier={dispute.tier} />
            <span
              data-testid={`dispute-card-sla-${dispute.id}`}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                urgencyChipClass[slaUrgency]
              )}
            >
              {urgencyLabel}
            </span>
          </div>

          <p className="mb-3 text-sm text-gray-600">
            {reasonLabel}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{displayName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatRelativeTime(dispute.created_at)}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {dispute.xp_stake} XP {t('xpStake').toLowerCase()}
            </span>
            {tracksReviewerResponse && dispute.response_deadline && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {t('triage.responseDeadlineInline', {
                  date: formatRelativeTime(dispute.response_deadline),
                })}
              </span>
            )}
          </div>

          {isEscalationCandidate && (
            <p className="mt-2 text-xs font-medium text-red-700">
              {t('triage.escalationCandidate')}
            </p>
          )}
          <p className="mt-2 text-[11px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
            {t('triage.openDetail')}
          </p>
        </div>
      </div>
    </Link>
  );
}
