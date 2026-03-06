'use client';

import { Edit2 } from 'lucide-react';
import { PROPOSAL_CATEGORY_LABELS } from '@/features/proposals/types';
import type { WizardStep } from '@/features/proposals/types';
import type { Step4ReviewProps } from './types';

export function Step4Review({ formData, goToStep, t }: Step4ReviewProps) {
  const sections = [
    {
      key: 'category',
      label: t('reviewSection_category'),
      value: PROPOSAL_CATEGORY_LABELS[formData.category],
      step: 1 as WizardStep,
    },
    { key: 'title', label: t('reviewSection_title'), value: formData.title, step: 1 as WizardStep },
    {
      key: 'summary',
      label: t('reviewSection_summary'),
      value: formData.summary,
      step: 1 as WizardStep,
    },
    {
      key: 'motivation',
      label: t('reviewSection_motivation'),
      value: formData.motivation,
      step: 2 as WizardStep,
    },
    {
      key: 'solution',
      label: t('reviewSection_solution'),
      value: formData.solution,
      step: 2 as WizardStep,
    },
    {
      key: 'budget',
      label: t('reviewSection_budget'),
      value: formData.budget || '',
      step: 3 as WizardStep,
    },
    {
      key: 'timeline',
      label: t('reviewSection_timeline'),
      value: formData.timeline || '',
      step: 3 as WizardStep,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reviewTitle')}</h3>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {t('reviewCheckpointHint')}
      </div>
      {sections.map((section) => (
        <div
          key={section.key}
          className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-1">{section.label}</p>
            <p className="text-gray-900 whitespace-pre-wrap">
              {section.value || (
                <span className="text-gray-400 italic">{t('reviewSection_empty')}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goToStep(section.step)}
            className="flex items-center gap-1 text-sm text-organic-orange hover:text-orange-600 font-medium shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('reviewEdit')}
          </button>
        </div>
      ))}
    </div>
  );
}
