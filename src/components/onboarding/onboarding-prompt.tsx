'use client';

import { ArrowRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { OnboardingState } from '@/features/onboarding/types';

interface OnboardingPromptProps {
  onboardingState: OnboardingState;
  onContinue: () => void;
  onDismiss: () => void;
}

export function OnboardingPrompt({ onboardingState, onContinue, onDismiss }: OnboardingPromptProps) {
  const t = useTranslations('Onboarding');

  if (onboardingState.all_complete) return null;

  const percent = Math.round((onboardingState.completed_count / onboardingState.total_steps) * 100);

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">{t('promptTitle')}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('promptProgress', {
              completed: onboardingState.completed_count,
              total: onboardingState.total_steps,
            })}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-organic-orange rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          {t('promptContinue')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
