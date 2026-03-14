'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { ProposalStatus } from '@/features/proposals';

const LIFECYCLE_STAGES: ProposalStatus[] = [
  'draft',
  'public',
  'discussion',
  'voting',
  'finalized',
];

interface StageStepperProps {
  currentStatus: ProposalStatus;
}

export function StageStepper({ currentStatus }: StageStepperProps) {
  const t = useTranslations('ProposalDetail');

  const isCanceled = currentStatus === 'canceled';
  const currentIndex = LIFECYCLE_STAGES.indexOf(
    currentStatus === 'qualified'
      ? 'public'
      : currentStatus === 'submitted'
        ? 'voting'
        : currentStatus === 'approved' || currentStatus === 'rejected'
          ? 'finalized'
          : currentStatus
  );

  const labelMap: Record<string, string> = {
    draft: t('stageDraft'),
    public: t('stagePublic'),
    discussion: t('stageDiscussion'),
    voting: t('stageVoting'),
    finalized: t('stageFinalized'),
  };

  if (isCanceled) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-sm text-gray-500">
        <span>{t('stageCanceled')}</span>
      </div>
    );
  }

  return (
    <div className="relative">
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide" role="list">
      {LIFECYCLE_STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={stage} className="flex items-center" role="listitem">
            {index > 0 && (
              <div
                className={`w-6 h-0.5 mx-0.5 ${
                  isPast ? 'bg-organic-orange' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isCurrent
                  ? 'bg-organic-orange text-white'
                  : isPast
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isPast && <Check className="w-3 h-3" />}
              {labelMap[stage]}
            </div>
          </div>
        );
      })}
    </div>
    <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
    </div>
  );
}
