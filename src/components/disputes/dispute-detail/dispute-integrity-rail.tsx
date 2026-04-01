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
      {/* Response deadline */}
      <div
        data-testid="dispute-response-deadline-panel"
        className="rounded-lg border border-border bg-card p-3"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-organic-terracotta" />
          <h3 className="text-xs font-semibold text-gray-900">{td('integrity.responseDeadlineTitle')}</h3>
        </div>
        <p className="text-xs text-gray-700">{responsePostureLabel}</p>
        {disputeWindowLabel && (
          <p className="mt-1 text-[11px] text-gray-500">
            {td('integrity.disputeWindow', { date: disputeWindowLabel })}
          </p>
        )}
      </div>

      {/* Evidence summary */}
      <div
        data-testid="dispute-evidence-chronology-panel"
        className="rounded-lg border border-border bg-card p-3"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <FileClock className="h-3.5 w-3.5 text-indigo-600" />
          <h3 className="text-xs font-semibold text-gray-900">{td('integrity.evidenceChronologyTitle')}</h3>
        </div>
        <p className="text-xs text-gray-700">
          {td('integrity.evidenceSummary', {
            files: evidenceFileUrlsCount,
            events: evidenceEventsCount,
          })}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {td('integrity.lateEvidenceSummary', { count: lateEvidenceCount })}
        </p>
      </div>

      {/* Escalation alert — only shown when SLA is overdue */}
      {escalationPosture && (
        <div
          data-testid="dispute-response-status-panel"
          className="rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <h3 className="text-xs font-semibold text-red-900">{td('integrity.responseStatusTitle')}</h3>
          </div>
          <p className="text-xs font-medium text-red-700">
            {td('integrity.escalationRecommended')}
          </p>
        </div>
      )}

      {/* Mediation path */}
      <div
        data-testid="dispute-mediation-path-panel"
        className="rounded-lg border border-border bg-card p-3"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
          <h3 className="text-xs font-semibold text-gray-900">{td('integrity.mediationPathTitle')}</h3>
        </div>
        <p className="text-xs text-gray-700">
          {dispute.tier === 'mediation'
            ? td('integrity.mediationActive')
            : dispute.tier === 'council'
              ? td('integrity.councilPath')
              : td('integrity.adminPath')}
        </p>
        <p className="mt-1 text-[11px] text-gray-500">{td('integrity.mediationHint')}</p>
      </div>
    </aside>
  );
}
