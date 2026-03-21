'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Clock, FileClock, ShieldAlert } from 'lucide-react';
import type { DisputeWithRelations } from '@/features/disputes/types';

interface DisputeIntegrityRailProps {
  dispute: DisputeWithRelations;
  responsePostureLabel: string;
  disputeWindowLabel: string | null;
  evidenceFileUrlsCount: number;
  evidenceEventsCount: number;
  lateEvidenceCount: number;
  escalationPosture: boolean;
}

export function DisputeIntegrityRail({
  dispute,
  responsePostureLabel,
  disputeWindowLabel,
  evidenceFileUrlsCount,
  evidenceEventsCount,
  lateEvidenceCount,
  escalationPosture,
}: DisputeIntegrityRailProps) {
  const td = useTranslations('Disputes.detail');

  return (
    <aside data-testid="dispute-integrity-rail" className="space-y-3">
      <div
        data-testid="dispute-response-deadline-panel"
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-900">{td('integrity.responseDeadlineTitle')}</h3>
        </div>
        <p className="text-sm text-gray-700">{responsePostureLabel}</p>
        {disputeWindowLabel && (
          <p className="mt-1 text-xs text-gray-500">
            {td('integrity.disputeWindow', { date: disputeWindowLabel })}
          </p>
        )}
      </div>

      <div
        data-testid="dispute-evidence-chronology-panel"
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <FileClock className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">{td('integrity.evidenceChronologyTitle')}</h3>
        </div>
        <p className="text-sm text-gray-700">
          {td('integrity.evidenceSummary', {
            files: evidenceFileUrlsCount,
            events: evidenceEventsCount,
          })}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {td('integrity.lateEvidenceSummary', { count: lateEvidenceCount })}
        </p>
      </div>

      {escalationPosture && (
        <div
          data-testid="dispute-response-status-panel"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-900">{td('integrity.responseStatusTitle')}</h3>
          </div>
          <p className="text-sm font-medium text-red-700">
            {td('integrity.escalationRecommended')}
          </p>
        </div>
      )}

      <div
        data-testid="dispute-mediation-path-panel"
        className="rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">{td('integrity.mediationPathTitle')}</h3>
        </div>
        <p className="text-sm text-gray-700">
          {dispute.tier === 'mediation'
            ? td('integrity.mediationActive')
            : dispute.tier === 'council'
              ? td('integrity.councilPath')
              : td('integrity.adminPath')}
        </p>
        <p className="mt-2 text-xs text-gray-500">{td('integrity.mediationHint')}</p>
      </div>
    </aside>
  );
}
