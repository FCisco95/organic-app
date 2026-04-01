'use client';

import { cn } from '@/lib/utils';
import { ONBOARDING_STEPS } from '@/features/onboarding/types';
import type { OnboardingProgress } from '@/features/onboarding/types';
import { useTranslations } from 'next-intl';

interface WizardProgressProps {
  currentStep: number;
  steps: OnboardingProgress;
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  const t = useTranslations('Onboarding');

  const completedCount = ONBOARDING_STEPS.filter((s) => steps[s]?.completed).length;
  const percent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);
  const currentStepKey = ONBOARDING_STEPS[currentStep];

  return (
    <div className="w-full space-y-2">
      {/* Slim horizontal progress bar */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            percent === 100 ? 'bg-green-500' : 'bg-cta'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Step label */}
      <p className="text-xs text-muted-foreground text-center">
        {t('stepOf', { current: currentStep + 1, total: ONBOARDING_STEPS.length })}
        {' · '}
        {t(`steps.${currentStepKey}.label`)}
      </p>
    </div>
  );
}
