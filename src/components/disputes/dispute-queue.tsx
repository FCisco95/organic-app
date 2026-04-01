'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDisputes } from '@/features/disputes/hooks';
import type { DisputeStatus, DisputeTier } from '@/features/disputes/types';
import {
  getDisputeSlaUrgency,
  isEscalationCandidate,
} from '@/features/disputes/sla';
import { DisputeCard } from './dispute-card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, CheckCircle, Scale } from 'lucide-react';

const STATUS_TABS: { key: string; statuses?: DisputeStatus }[] = [
  { key: 'all' },
  { key: 'open', statuses: 'open' },
  { key: 'awaiting_response', statuses: 'awaiting_response' },
  { key: 'under_review', statuses: 'under_review' },
  { key: 'resolved', statuses: 'resolved' },
  { key: 'dismissed', statuses: 'dismissed' },
];

const TIER_TABS: { key: string; tier?: DisputeTier }[] = [
  { key: 'all' },
  { key: 'mediation', tier: 'mediation' },
  { key: 'council', tier: 'council' },
  { key: 'admin', tier: 'admin' },
];

interface DisputeQueueProps {
  myDisputes?: boolean;
  showTriageControls?: boolean;
}

export function DisputeQueue({ myDisputes = false, showTriageControls = false }: DisputeQueueProps) {
  const t = useTranslations('Disputes');
  const [activeTab, setActiveTab] = useState('all');
  const [activeTierTab, setActiveTierTab] = useState('all');

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
  const escalationCount = rawDisputes.filter((dispute) =>
    isEscalationCandidate(dispute.status, dispute.response_deadline)
  ).length;

  // Count disputes per status tab
  const statusCounts: Record<string, number> = { all: rawDisputes.length };
  for (const d of rawDisputes) {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  }

  return (
    <div data-testid="disputes-queue-surface" className="space-y-3">
      {/* Triage panel — collapsible for council/admin */}
      {showTriageControls && (
        <div
          data-testid="disputes-triage-deck"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5"
        >
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-gray-400">
            {t('tabs.triageLabel')}
          </span>

          {overdueCount > 0 && (
            <span
              data-testid="disputes-sla-counter-overdue"
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
            >
              <AlertTriangle className="h-3 w-3" />
              {t('triage.overdue')} ({overdueCount})
            </span>
          )}
          {atRiskCount > 0 && (
            <span
              data-testid="disputes-sla-counter-at-risk"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
            >
              <TrendingUp className="h-3 w-3" />
              {t('triage.atRisk')} ({atRiskCount})
            </span>
          )}
          {escalationCount > 0 && (
            <span
              data-testid="disputes-sla-counter-escalation"
              className="inline-flex items-center gap-1 rounded-full bg-organic-terracotta-light/30 px-2.5 py-1 text-xs font-semibold text-organic-terracotta-hover"
            >
              {t('triage.escalationReady')} ({escalationCount})
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            <CheckCircle className="h-3 w-3" />
            {t('triage.totalActive', { count: rawDisputes.length })}
          </span>

          {/* Tier chips */}
          <div className="ml-auto flex items-center gap-1.5">
            {TIER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                data-testid={`disputes-tier-filter-${tab.key}`}
                onClick={() => setActiveTierTab(tab.key)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  activeTierTab === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab.key === 'all' ? t('triage.allTiers') : t(`tier.${tab.key}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status tabs — GitHub-style underline tabs with counts */}
      <div
        data-testid="disputes-status-filter-tabs"
        className="flex gap-0.5 overflow-x-auto border-b border-border"
      >
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              type="button"
              data-testid={`disputes-status-filter-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-organic-terracotta text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.key === 'all' ? t('title') : t(`status.${tab.key}`)}
              {count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                    activeTab === tab.key
                      ? 'bg-organic-terracotta-light/30 text-organic-terracotta-hover'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dispute list — GitHub issue list style */}
      {isLoading ? (
        <div className="space-y-0 divide-y divide-border rounded-lg border border-border bg-card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error)?.message || t('queueEmptyHint')}
        </div>
      ) : rawDisputes.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center rounded-lg border border-dashed border-border bg-muted/30">
          <Scale className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {myDisputes ? t('myDisputesEmpty') : t('queueEmpty')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {myDisputes ? t('myDisputesEmptyHint') : t('queueEmptyHint')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {rawDisputes.map((dispute) => (
            <DisputeCard key={dispute.id} dispute={dispute} />
          ))}
        </div>
      )}
    </div>
  );
}
