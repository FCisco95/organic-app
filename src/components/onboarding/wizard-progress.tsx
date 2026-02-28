'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEPS } from '@/features/onboarding/types';
import type { OnboardingStep, OnboardingProgress } from '@/features/onboarding/types';
import { useTranslations } from 'next-intl';

interface WizardProgressProps {
  currentStep: number;
  steps: OnboardingProgress;
}

const STEP_ICONS: Record<OnboardingStep, string> = {
  connect_wallet: '🔗',
  verify_token: '✅',
  pick_task: '📋',
  join_sprint: '🏃',
};

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  const t = useTranslations('Onboarding');

  return (
    <div className="flex items-center justify-between w-full px-4">
      {ONBOARDING_STEPS.map((step, index) => {
        const isCompleted = steps[step]?.completed;
        const isCurrent = index === currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isCompleted && 'bg-green-500/20 text-green-400 border border-green-500/40',
                  isCurrent &&
                    !isCompleted &&
                    'bg-organic-orange/20 text-organic-orange border border-organic-orange/40 ring-2 ring-organic-orange/20',
                  !isCompleted &&
                    !isCurrent &&
                    'bg-gray-800 text-gray-500 border border-gray-700'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{STEP_ICONS[step]}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  isCompleted && 'text-green-400',
                  isCurrent && !isCompleted && 'text-organic-orange',
                  !isCompleted && !isCurrent && 'text-gray-500'
                )}
              >
                {t(`steps.${step}.label`)}
              </span>
            </div>

            {/* Connector line */}
            {index < ONBOARDING_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 mt-[-18px]',
                  isCompleted ? 'bg-green-500/40' : 'bg-gray-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
