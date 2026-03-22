'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WizardProgress } from './wizard-progress';
import { StepConnectWallet } from './steps/step-connect-wallet';
import { StepVerifyToken } from './steps/step-verify-token';
import { StepPickTask } from './steps/step-pick-task';
import { StepJoinSprint } from './steps/step-join-sprint';
import { ONBOARDING_STEPS } from '@/features/onboarding/types';
import type { OnboardingState } from '@/features/onboarding/types';
import { ChevronLeft, ChevronRight, PartyPopper, LayoutDashboard, ClipboardList } from 'lucide-react';
import { Link } from '@/i18n/navigation';

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
    return idx === -1 ? ONBOARDING_STEPS.length : idx;
  }, [onboardingState.steps]);

  const [currentStep, setCurrentStep] = useState(firstIncompleteIndex);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const allComplete = onboardingState.all_complete || firstIncompleteIndex === ONBOARDING_STEPS.length;
  const showCompletion = allComplete || currentStep >= ONBOARDING_STEPS.length;

  const handleStepComplete = useCallback(() => {
    onRefresh();
    // Move to next incomplete step
    const nextIncomplete = ONBOARDING_STEPS.findIndex(
      (step, idx) => idx > currentStep && !onboardingState.steps[step]?.completed
    );
    if (nextIncomplete !== -1) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(nextIncomplete);
        setIsAnimating(false);
      }, 150);
    } else if (currentStep < ONBOARDING_STEPS.length - 1) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep, onboardingState.steps, onRefresh]);

  const handleSkip = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      onOpenChange(false);
    }
  }, [currentStep, onOpenChange]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setSlideDirection('right');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      // Show completion screen
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(ONBOARDING_STEPS.length);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep]);

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      const idx = ONBOARDING_STEPS.findIndex((step) => !onboardingState.steps[step]?.completed);
      setCurrentStep(idx === -1 ? ONBOARDING_STEPS.length : idx);
      setIsAnimating(false);
    }
  }, [open, onboardingState.steps]);

  const currentStepKey = currentStep < ONBOARDING_STEPS.length ? ONBOARDING_STEPS[currentStep] : null;
  const isStepCompleted = currentStepKey ? onboardingState.steps[currentStepKey]?.completed : false;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  if (onboardingState.all_complete && !open) {
    return null;
  }

  const slideTransform = isAnimating
    ? slideDirection === 'left'
      ? 'translate-x-8 opacity-0'
      : '-translate-x-8 opacity-0'
    : 'translate-x-0 opacity-100';

  const totalXp = onboardingState.completed_count * 25;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden bg-card border-border">
        {/* Progress bar at top */}
        <div className="px-6 pt-5 pb-3">
          {!showCompletion && (
            <WizardProgress currentStep={currentStep} steps={onboardingState.steps} />
          )}
        </div>

        {/* Header */}
        <DialogHeader className="px-6 pb-2">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t('wizardTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('wizardDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Step Content with slide transitions */}
        <div className="relative overflow-hidden">
          <div
            ref={contentRef}
            className={`px-6 py-8 min-h-[320px] flex items-center justify-center transition-all duration-300 ease-out ${slideTransform}`}
          >
            {showCompletion ? (
              /* Completion screen */
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <PartyPopper className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {t('completionTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('completionSubtitle')}
                  </p>
                  <p className="text-2xl font-mono font-bold text-organic-orange">
                    {t('completionXp', { xp: totalXp })}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href="/tasks"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    {t('exploreTasks')}
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t('viewDashboard')}
                  </Link>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Warm footer */}
        {!showCompletion && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('back')}
              </button>

              <div className="flex items-center gap-3">
                {isStepCompleted && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    {isLastStep ? t('finish') : t('next')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Skip link - subtle, below main buttons */}
            {!isStepCompleted && (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLastStep ? t('close') : t('skip')}
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
