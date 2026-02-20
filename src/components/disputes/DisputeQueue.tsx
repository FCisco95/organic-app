'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDisputes } from '@/features/disputes/hooks';
import type { DisputeStatus, DisputeTier } from '@/features/disputes/types';
import {
  getDisputeSlaUrgency,
  isEscalationCandidate,
} from '@/features/disputes/sla';
import { DisputeCard } from './DisputeCard';
import { cn } from '@/lib/utils';

const STATUS_TABS: { key: string; statuses?: DisputeStatus }[] = [
  { key: 'all' },
  { key: 'open', statuses: 'open' },
  { key: 'awaiting_response', statuses: 'awaiting_response' },
  { key: 'under_review', statuses: 'under_review' },
  { key: 'resolved', statuses: 'resolved' },
  { key: 'dismissed', statuses: 'dismissed' },
];

const SLA_TABS = [
  { key: 'all' },
  { key: 'overdue' },
  { key: 'at_risk' },
  { key: 'on_track' },
] as const;
const SLA_TAB_LABEL_KEYS = {
  overdue: 'overdue',
  at_risk: 'atRisk',
  on_track: 'onTrack',
} as const;

const TIER_TABS: { key: string; tier?: DisputeTier }[] = [
  { key: 'all' },
  { key: 'mediation', tier: 'mediation' },
  { key: 'council', tier: 'council' },
  { key: 'admin', tier: 'admin' },
];

interface DisputeQueueProps {
  myDisputes?: boolean;
}

export function DisputeQueue({ myDisputes = false }: DisputeQueueProps) {
  const t = useTranslations('Disputes');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSlaTab, setActiveSlaTab] = useState<(typeof SLA_TABS)[number]['key']>('all');
  const [activeTierTab, setActiveTierTab] = useState('all');
  const [escalationOnly, setEscalationOnly] = useState(false);

  const selectedStatus = STATUS_TABS.find((tab) => tab.key === activeTab)?.statuses;
  const selectedTier = TIER_TABS.find((tab) => tab.key === activeTierTab)?.tier;

  const { data, isLoading, isError, error } = useDisputes({
    status: selectedStatus,
    tier: selectedTier,
    my_disputes: myDisputes || undefined,
  });

  const rawDisputes = data?.data ?? [];
  const overdueCount = rawDisputes.filter(
    (dispute) => getDisputeSlaUrgency(dispute.response_deadline) === 'overdue'
  ).length;
  const atRiskCount = rawDisputes.filter(
    (dispute) => getDisputeSlaUrgency(dispute.response_deadline) === 'at_risk'
  ).length;
  const onTrackCount = rawDisputes.filter(
    (dispute) => getDisputeSlaUrgency(dispute.response_deadline) === 'on_track'
  ).length;
  const escalationCount = rawDisputes.filter((dispute) =>
    isEscalationCandidate(dispute.status, dispute.response_deadline)
  ).length;

  const disputes = rawDisputes.filter((dispute) => {
    if (
      activeSlaTab !== 'all' &&
      getDisputeSlaUrgency(dispute.response_deadline) !== activeSlaTab
    ) {
      return false;
    }

    if (escalationOnly && !isEscalationCandidate(dispute.status, dispute.response_deadline)) {
      return false;
    }

    return true;
  });

  return (
    <div data-testid="disputes-queue-surface" className="space-y-4">
      <div
        data-testid="disputes-triage-deck"
        className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4"
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('triage.title')}</h3>
            <p className="mt-1 text-xs text-gray-500">{t('triage.subtitle')}</p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 shadow-sm">
            {t('triage.totalActive', { count: rawDisputes.length })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <TriageCounter
            testId="disputes-sla-counter-overdue"
            label={t('triage.overdue')}
            value={overdueCount}
            tone="danger"
          />
          <TriageCounter
            testId="disputes-sla-counter-at-risk"
            label={t('triage.atRisk')}
            value={atRiskCount}
            tone="warn"
          />
          <TriageCounter
            testId="disputes-sla-counter-on-track"
            label={t('triage.onTrack')}
            value={onTrackCount}
            tone="ok"
          />
          <TriageCounter
            testId="disputes-sla-counter-escalation"
            label={t('triage.escalationReady')}
            value={escalationCount}
            tone="neutral"
          />
        </div>
      </div>

      <div
        data-testid="disputes-escalation-controls"
        className="rounded-xl border border-gray-200 bg-white p-3"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
            {t('triage.escalationControls')}
          </p>
          <button
            type="button"
            data-testid="disputes-escalation-toggle"
            onClick={() => setEscalationOnly((prev) => !prev)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              escalationOnly
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {escalationOnly ? t('triage.showAll') : t('triage.focusEscalation')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="disputes-escalation-tier-council"
            onClick={() => setActiveTierTab('council')}
            className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700"
          >
            {t('triage.routeCouncil')}
          </button>
          <button
            type="button"
            data-testid="disputes-escalation-tier-admin"
            onClick={() => setActiveTierTab('admin')}
            className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          >
            {t('triage.routeAdmin')}
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div
        data-testid="disputes-status-filter-tabs"
        className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-1"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`disputes-status-filter-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {tab.key === 'all' ? t('title') : t(`status.${tab.key}`)}
          </button>
        ))}
      </div>

      <div
        data-testid="disputes-sla-filter-tabs"
        className="flex flex-wrap items-center gap-2"
      >
        {SLA_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`disputes-sla-filter-${tab.key}`}
            onClick={() => setActiveSlaTab(tab.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeSlaTab === tab.key
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.key === 'all'
              ? t('triage.allSla')
              : t(`triage.${SLA_TAB_LABEL_KEYS[tab.key as keyof typeof SLA_TAB_LABEL_KEYS]}`)}
          </button>
        ))}
      </div>

      <div
        data-testid="disputes-tier-filter-tabs"
        className="flex flex-wrap items-center gap-2"
      >
        {TIER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`disputes-tier-filter-${tab.key}`}
            onClick={() => setActiveTierTab(tab.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeTierTab === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.key === 'all' ? t('triage.allTiers') : t(`tier.${tab.key}`)}
          </button>
        ))}
      </div>

      {/* Dispute list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error)?.message || t('queueEmptyHint')}
        </div>
      ) : disputes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 text-sm">
            {myDisputes ? t('myDisputesEmpty') : t('queueEmpty')}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {myDisputes ? t('myDisputesEmptyHint') : t('queueEmptyHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <DisputeCard key={dispute.id} dispute={dispute} />
          ))}
        </div>
      )}
    </div>
  );
}

function TriageCounter({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'warn' | 'ok' | 'neutral';
  testId: string;
}) {
  const toneClass = {
    danger: 'border-red-200 bg-red-50 text-red-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    neutral: 'border-gray-200 bg-gray-50 text-gray-700',
  }[tone];

  return (
    <div data-testid={testId} className={cn('rounded-xl border px-3 py-2', toneClass)}>
      <p className="text-[11px] font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none">{value}</p>
    </div>
  );
}
