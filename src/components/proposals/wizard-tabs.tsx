'use client';

import { Check, Tag, FileText, Wallet, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/features/proposals/types';

interface WizardTabsProps {
  currentStep: WizardStep;
  onTabClick: (step: WizardStep) => void;
  labels: string[];
}

const STEPS: WizardStep[] = [1, 2, 3, 4];

const STEP_ICONS = [Tag, FileText, Wallet, Send];

export function WizardTabs({ currentStep, onTabClick, labels }: WizardTabsProps) {
  const t = useTranslations('ProposalWizard');

  const shortLabels = [
    t('stepperLabelCategory'),
    t('stepperLabelProblem'),
    t('stepperLabelBudget'),
    t('stepperLabelReview'),
  ];

  // Suppress unused variable — labels kept for API compat
  void labels;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((stepNum, i) => {
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;
          const Icon = STEP_ICONS[i];

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => onTabClick(stepNum)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    isCompleted
                      ? 'bg-cta text-cta-fg'
                      : isActive
                        ? 'bg-cta text-cta-fg ring-4 ring-cta/20'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4.5 h-4.5" />
                  )}
                </div>
                {/* Short label: hidden on mobile, visible on sm+ */}
                <span
                  className={cn(
                    'hidden sm:block text-xs font-medium transition-colors',
                    isActive
                      ? 'text-organic-terracotta'
                      : isCompleted
                        ? 'text-organic-terracotta/70'
                        : 'text-gray-400'
                  )}
                >
                  {shortLabels[i]}
                </span>
              </button>

              {/* Connector line between steps */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 sm:mx-3 transition-colors',
                    isCompleted ? 'bg-cta' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
