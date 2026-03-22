'use client';

import { useTranslations } from 'next-intl';
import type { RewardClaimStatus } from '@/features/rewards';

const TIMELINE_STEPS: RewardClaimStatus[] = ['pending', 'approved', 'paid'];

const STEP_COLORS: Record<
  string,
  { active: string; dot: string; line: string }
> = {
  pending: {
    active: 'bg-amber-500',
    dot: 'bg-amber-500',
    line: 'bg-amber-300',
  },
  approved: {
    active: 'bg-blue-500',
    dot: 'bg-blue-500',
    line: 'bg-blue-300',
  },
  paid: {
    active: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    line: 'bg-emerald-300',
  },
  rejected: {
    active: 'bg-red-500',
    dot: 'bg-red-500',
    line: 'bg-red-300',
  },
};

function getStepIndex(status: RewardClaimStatus): number {
  if (status === 'rejected') return -1;
  return TIMELINE_STEPS.indexOf(status);
}

interface ClaimTimelineProps {
  status: RewardClaimStatus;
}

export function ClaimTimeline({ status }: ClaimTimelineProps) {
  const t = useTranslations('Rewards');
  const currentIndex = getStepIndex(status);
  const isRejected = status === 'rejected';

  if (isRejected) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex h-2 w-2 rounded-full bg-red-500" />
        <span className="text-[11px] font-medium text-red-700">
          {t('claimStatus.rejected')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {TIMELINE_STEPS.map((step, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const colors = STEP_COLORS[step];

        return (
          <div key={step} className="flex items-center gap-0.5">
            {index > 0 && (
              <div
                className={`h-0.5 w-3 rounded-full ${
                  isPast || isCurrent ? colors.line : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`flex h-2 w-2 rounded-full ${
                isPast || isCurrent ? colors.dot : 'bg-gray-200'
              } ${isCurrent ? 'ring-2 ring-offset-1 ring-' + step : ''}`}
              style={
                isCurrent
                  ? {
                      boxShadow: `0 0 0 2px white, 0 0 0 3.5px ${
                        step === 'pending'
                          ? '#f59e0b'
                          : step === 'approved'
                            ? '#3b82f6'
                            : '#10b981'
                      }`,
                    }
                  : undefined
              }
              title={t(`claimStatus.${step}`)}
            />
          </div>
        );
      })}
    </div>
  );
}
