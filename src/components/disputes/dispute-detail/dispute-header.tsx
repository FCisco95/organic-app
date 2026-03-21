'use client';

import { useTranslations } from 'next-intl';
import type { DisputeWithRelations, DisputeResolution } from '@/features/disputes/types';
import { DISPUTE_RESOLUTION_LABELS } from '@/features/disputes/types';
import { DisputeStatusBadge } from '../dispute-status-badge';
import { DisputeTierBadge } from '../dispute-tier-badge';
import { cn } from '@/lib/utils';
import type { DisputeSlaUrgency } from '@/features/disputes/sla';
import { formatRelativeTime } from './utils';

interface DisputeHeaderProps {
  dispute: DisputeWithRelations;
  responseSlaUrgency: DisputeSlaUrgency;
}

export function DisputeHeader({ dispute, responseSlaUrgency }: DisputeHeaderProps) {
  const t = useTranslations('Disputes');
  const td = useTranslations('Disputes.detail');

  const resolutionLabel = dispute.resolution
    ? DISPUTE_RESOLUTION_LABELS[dispute.resolution as DisputeResolution]
    : null;

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

  const slaChipClass = cn(
    'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
    responseSlaUrgency === 'overdue'
      ? 'border-red-200 bg-red-100 text-red-700'
      : responseSlaUrgency === 'at_risk'
        ? 'border-amber-200 bg-amber-100 text-amber-700'
        : responseSlaUrgency === 'on_track'
          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
          : 'border-gray-200 bg-gray-100 text-gray-600'
  );
  const slaLabel =
    responseSlaUrgency === 'overdue'
      ? t('triage.overdue')
      : responseSlaUrgency === 'at_risk'
        ? t('triage.atRisk')
        : responseSlaUrgency === 'on_track'
          ? t('triage.onTrack')
          : t('triage.noDeadline');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Title */}
      <h1 className="text-xl font-bold text-gray-900">
        {dispute.task?.title || td('task')}
      </h1>

      {/* Meta line */}
      <p className="mt-1 text-sm text-gray-500">
        {reasonLabel} &middot; {formatRelativeTime(dispute.created_at)}
      </p>

      {/* Label pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DisputeStatusBadge status={dispute.status} />
        <DisputeTierBadge tier={dispute.tier} />
        {resolutionLabel && (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            {resolutionLabel}
          </span>
        )}
        <span className={slaChipClass}>{slaLabel}</span>
      </div>
    </div>
  );
}
