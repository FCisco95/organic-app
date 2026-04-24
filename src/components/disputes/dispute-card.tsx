'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { DisputeListItem } from '@/features/disputes/types';
import {
  getDisputeSlaUrgency,
  isReviewerResponseTracked,
} from '@/features/disputes/sla';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from './dispute-detail/utils';

interface DisputeCardProps {
  dispute: DisputeListItem;
}

/** Status icon colors matching GitHub's circle indicators */
const STATUS_ICON_COLORS: Record<string, string> = {
  open: 'bg-emerald-500',
  awaiting_response: 'bg-amber-500',
  mediation: 'bg-amber-400',
  under_review: 'bg-organic-terracotta-lightest0',
  resolved: 'bg-blue-500',
  dismissed: 'bg-gray-400',
  appealed: 'bg-red-500',
  appeal_review: 'bg-red-400',
  withdrawn: 'bg-gray-300',
  mediated: 'bg-emerald-400',
};

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
  const slaUrgency = getDisputeSlaUrgency(dispute.response_deadline);

  const slaChipClass: Record<typeof slaUrgency, string> = {
    overdue: 'bg-red-100 text-red-700 border-red-200',
    at_risk: 'bg-amber-100 text-amber-700 border-amber-200',
    on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    no_deadline: 'bg-gray-100 text-gray-500 border-border',
  };
  const slaLabel =
    slaUrgency === 'overdue'
      ? t('triage.overdue')
      : slaUrgency === 'at_risk'
        ? t('triage.atRisk')
        : slaUrgency === 'on_track'
          ? t('triage.onTrack')
          : t('triage.noDeadline');

  const tierChipClass: Record<string, string> = {
    mediation: 'bg-blue-50 text-blue-700 border-blue-200',
    council: 'bg-purple-50 text-purple-700 border-purple-200',
    admin: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <Link
      href={`/disputes/${dispute.id}`}
      data-testid={`dispute-card-${dispute.id}`}
      className="group flex items-start gap-3 border-b border-border bg-white px-4 py-3 transition-colors hover:bg-gray-50 last:border-b-0"
    >
      {/* Status dot */}
      <div className="mt-1.5 flex shrink-0">
        <span
          className={cn(
            'h-3 w-3 rounded-full',
            STATUS_ICON_COLORS[dispute.status] || 'bg-gray-400'
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-organic-terracotta-hover">
          {taskTitle}
        </h3>

        {/* Label pills row */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
              tierChipClass[dispute.tier] || 'bg-gray-100 text-gray-600 border-border'
            )}
          >
            {t(`tier.${dispute.tier}`)}
          </span>
          <span
            data-testid={`dispute-card-sla-${dispute.id}`}
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
              slaChipClass[slaUrgency]
            )}
          >
            {slaLabel}
          </span>
          <span className="inline-flex rounded-full border border-border bg-gray-50 px-2 py-0.5 text-[11px] font-medium leading-none text-gray-600">
            {reasonLabel}
          </span>
        </div>

        {/* Meta line */}
        <p className="mt-1.5 text-xs text-gray-500">
          {t('tabs.openedAgo', {
            time: formatRelativeTime(dispute.created_at),
            name: displayName,
          })}{' '}
          <span className="text-gray-400">
            &middot; {dispute.xp_stake} XP {t('xpStake').toLowerCase()}
          </span>
        </p>
      </div>
    </Link>
  );
}
