'use client';

import { Edit2 } from 'lucide-react';
import type { WizardStep } from '@/features/proposals/types';
import type { Step4ReviewProps } from './types';
import { CategoryBadge } from '../category-badge';
import type { ProposalCategory } from '@/features/proposals/types';

type ReviewItem =
  | { key: string; label: string; type: 'text'; value: string }
  | { key: string; label: string; type: 'category' };

interface ReviewGroup {
  titleKey: string;
  step: WizardStep;
  items: ReviewItem[];
}

export function Step4Review({ formData, goToStep, t }: Step4ReviewProps) {
  const groups: ReviewGroup[] = [
    {
      titleKey: 'reviewGroupCategoryTitle',
      step: 1,
      items: [
        {
          key: 'category',
          label: t('reviewSection_category'),
          type: 'category' as const,
        },
        { key: 'title', label: t('reviewSection_title'), type: 'text' as const, value: formData.title },
        { key: 'summary', label: t('reviewSection_summary'), type: 'text' as const, value: formData.summary },
      ],
    },
    {
      titleKey: 'reviewGroupProblemSolution',
      step: 2,
      items: [
        {
          key: 'motivation',
          label: t('reviewSection_motivation'),
          type: 'text' as const,
          value: formData.motivation,
        },
        {
          key: 'solution',
          label: t('reviewSection_solution'),
          type: 'text' as const,
          value: formData.solution,
        },
      ],
    },
    {
      titleKey: 'reviewGroupBudgetTimeline',
      step: 3,
      items: [
        {
          key: 'budget',
          label: t('reviewSection_budget'),
          type: 'text' as const,
          value: formData.budget || '',
        },
        {
          key: 'timeline',
          label: t('reviewSection_timeline'),
          type: 'text' as const,
          value: formData.timeline || '',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('reviewTitle')}</h3>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('reviewCheckpointHint')}
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.titleKey} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">{t(group.titleKey)}</h4>
            <button
              type="button"
              onClick={() => goToStep(group.step)}
              className="flex items-center gap-1 text-xs text-organic-orange hover:text-orange-600 font-medium"
            >
              <Edit2 className="w-3 h-3" />
              {t('reviewEdit')}
            </button>
          </div>
          <div className="space-y-3">
            {group.items.map((item) => (
              <div key={item.key}>
                <p className="text-xs font-medium text-gray-500 mb-0.5">{item.label}</p>
                {item.type === 'category' ? (
                  <CategoryBadge category={formData.category as ProposalCategory} />
                ) : item.value ? (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{item.value}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">{t('reviewSection_empty')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* What happens next — shown only on Review tab */}
      <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">{t('nextTitle')}</h4>
        <ul className="text-xs text-gray-700 space-y-1.5">
          <li>{t('nextStep1')}</li>
          <li>{t('nextStep2')}</li>
          <li>{t('nextStep3')}</li>
          <li>{t('nextStep4')}</li>
        </ul>
      </div>
    </div>
  );
}
