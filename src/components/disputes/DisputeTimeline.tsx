'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
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
  className?: string;
}

export function DisputeTimeline({ status, tier, className }: DisputeTimelineProps) {
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

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
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
  );
}
