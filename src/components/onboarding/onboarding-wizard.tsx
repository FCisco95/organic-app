'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WizardProgress } from './wizard-progress';
import { StepConnectWallet } from './steps/step-connect-wallet';
import { StepVerifyToken } from './steps/step-verify-token';
import { StepPickTask } from './steps/step-pick-task';
import { StepJoinSprint } from './steps/step-join-sprint';
import { ONBOARDING_STEPS } from '@/features/onboarding/types';
import type { OnboardingState } from '@/features/onboarding/types';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onboardingState: OnboardingState;
  onRefresh: () => void;
}

export function OnboardingWizard({ open, onOpenChange, onboardingState, onRefresh }: OnboardingWizardProps) {
  const t = useTranslations('Onboarding');

  // Find first incomplete step
  const firstIncompleteIndex = useMemo(() => {
    const idx = ONBOARDING_STEPS.findIndex((step) => !onboardingState.steps[step]?.completed);
    return idx === -1 ? 0 : idx;
  }, [onboardingState.steps]);

  const [currentStep, setCurrentStep] = useState(firstIncompleteIndex);

  const handleStepComplete = useCallback(() => {
    onRefresh();
    // Move to next incomplete step
    const nextIncomplete = ONBOARDING_STEPS.findIndex(
      (step, idx) => idx > currentStep && !onboardingState.steps[step]?.completed
    );
    if (nextIncomplete !== -1) {
      setCurrentStep(nextIncomplete);
    } else if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, onboardingState.steps, onRefresh]);

  const handleSkip = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  }, [currentStep, onOpenChange]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const currentStepKey = ONBOARDING_STEPS[currentStep];
  const isStepCompleted = onboardingState.steps[currentStepKey]?.completed;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  if (onboardingState.all_complete) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-800">
          <DialogTitle>{t('wizardTitle')}</DialogTitle>
          <DialogDescription>{t('wizardDescription')}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="px-2 py-4 border-b border-gray-800/50">
          <WizardProgress currentStep={currentStep} steps={onboardingState.steps} />
        </div>

        {/* Step Content */}
        <div className="px-6 py-2 min-h-[280px] flex items-center justify-center">
          {currentStepKey === 'connect_wallet' && (
            <StepConnectWallet completed={!!isStepCompleted} onComplete={handleStepComplete} />
          )}
          {currentStepKey === 'verify_token' && (
            <StepVerifyToken completed={!!isStepCompleted} onComplete={handleStepComplete} />
          )}
          {currentStepKey === 'pick_task' && (
            <StepPickTask completed={!!isStepCompleted} onComplete={handleStepComplete} />
          )}
          {currentStepKey === 'join_sprint' && (
            <StepJoinSprint completed={!!isStepCompleted} onComplete={handleStepComplete} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('back')}
          </button>

          <div className="flex items-center gap-2">
            {!isStepCompleted && (
              <button
                type="button"
                onClick={handleSkip}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {isLastStep ? (
                  <>
                    <X className="w-4 h-4" />
                    {t('close')}
                  </>
                ) : (
                  t('skip')
                )}
              </button>
            )}

            {isStepCompleted && !isLastStep && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-organic-orange hover:bg-orange-600 text-white rounded-md transition-colors"
              >
                {t('next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {isStepCompleted && isLastStep && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                {t('finish')}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
