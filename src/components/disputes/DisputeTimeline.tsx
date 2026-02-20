'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { isDeadlinePast } from '@/features/disputes/sla';
import type { DisputeStatus } from '@/features/disputes/types';
import { TERMINAL_STATUSES } from '@/features/disputes/types';

interface TimelineStep {
  key: string;
  label: string;
  completed: boolean;
  active: boolean;
}

interface DisputeTimelineProps {
  status: DisputeStatus;
  tier: string;
  responseDeadline?: string | null;
  disputeWindowEndsAt?: string | null;
  lateEvidenceCount?: number;
  className?: string;
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return format(date, 'PPp');
}

export function DisputeTimeline({
  status,
  tier,
  responseDeadline,
  disputeWindowEndsAt,
  lateEvidenceCount = 0,
  className,
}: DisputeTimelineProps) {
  const t = useTranslations('Disputes.timeline');

  const getSteps = (): TimelineStep[] => {
    const isTerminal = TERMINAL_STATUSES.includes(status);
    const statusOrder = [
      'open',
      'mediation',
      'awaiting_response',
      'under_review',
      'resolved',
    ];
    const currentIndex = statusOrder.indexOf(status);

    const steps: TimelineStep[] = [
      {
        key: 'filed',
        label: t('filed'),
        completed: true,
        active: status === 'open',
      },
    ];

    if (tier === 'mediation' || status === 'mediation' || status === 'mediated') {
      steps.push({
        key: 'mediation',
        label: t('mediationStarted'),
        completed: currentIndex > 1 || status === 'mediated',
        active: status === 'mediation',
      });
    }

    steps.push({
      key: 'response',
      label: t('responseSubmitted'),
      completed: currentIndex > 2,
      active: status === 'awaiting_response',
    });

    steps.push({
      key: 'review',
      label: t('underReview'),
      completed: currentIndex > 3 || isTerminal,
      active: status === 'under_review' || status === 'appeal_review',
    });

    if (status === 'appealed' || status === 'appeal_review') {
      steps.push({
        key: 'appealed',
        label: t('appealed'),
        completed: status === 'appeal_review' || isTerminal,
        active: status === 'appealed',
      });
    }

    const terminalLabel =
      status === 'withdrawn'
        ? t('withdrawn')
        : status === 'mediated'
          ? t('mediated')
          : t('resolved');

    steps.push({
      key: 'resolved',
      label: terminalLabel,
      completed: isTerminal,
      active: isTerminal,
    });

    return steps;
  };

  const steps = getSteps();
  const responseDeadlineLabel = formatDateTime(responseDeadline);
  const disputeWindowEndsAtLabel = formatDateTime(disputeWindowEndsAt);

  return (
    <div data-testid="dispute-phase-timeline" className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.key} data-testid={`dispute-phase-step-${step.key}`} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full border-2',
                  step.completed
                    ? 'bg-green-500 border-green-500'
                    : step.active
                      ? 'bg-orange-500 border-orange-500'
                      : 'bg-gray-200 border-gray-300'
                )}
              />
              <span
                className={cn(
                  'text-[10px] mt-1 whitespace-nowrap',
                  step.completed || step.active
                    ? 'text-gray-700 font-medium'
                    : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 mb-4',
                  step.completed ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {responseDeadlineLabel && (
          <span
            data-testid="dispute-response-deadline-chip"
            className={cn(
              'rounded-full px-2 py-1 text-[11px] font-medium',
              isDeadlinePast(responseDeadline)
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            )}
          >
            {isDeadlinePast(responseDeadline)
              ? t('responseOverdue', { date: responseDeadlineLabel })
              : t('responseDue', { date: responseDeadlineLabel })}
          </span>
        )}

        {disputeWindowEndsAtLabel && (
          <span
            data-testid="dispute-window-deadline-chip"
            className={cn(
              'rounded-full px-2 py-1 text-[11px] font-medium',
              isDeadlinePast(disputeWindowEndsAt)
                ? 'bg-gray-200 text-gray-700'
                : 'bg-blue-100 text-blue-700'
            )}
          >
            {isDeadlinePast(disputeWindowEndsAt)
              ? t('disputeWindowClosed', { date: disputeWindowEndsAtLabel })
              : t('disputeWindowCloses', { date: disputeWindowEndsAtLabel })}
          </span>
        )}

        {lateEvidenceCount > 0 && (
          <span
            data-testid="dispute-late-evidence-chip"
            className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-medium text-orange-700"
          >
            {t('lateEvidenceCount', { count: lateEvidenceCount })}
          </span>
        )}
      </div>
    </div>
  );
}
