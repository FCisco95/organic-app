'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/features/proposals/types';

interface WizardTabsProps {
  currentStep: WizardStep;
  onTabClick: (step: WizardStep) => void;
  labels: string[];
}

const STEPS: WizardStep[] = [1, 2, 3, 4];

export function WizardTabs({ currentStep, onTabClick, labels }: WizardTabsProps) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6" aria-label="Wizard steps">
        {STEPS.map((stepNum, i) => {
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;

          return (
            <button
              key={stepNum}
              type="button"
              onClick={() => onTabClick(stepNum)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-organic-orange text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <span className="flex items-center gap-1.5">
                {isCompleted && (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                )}
                {labels[i]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
