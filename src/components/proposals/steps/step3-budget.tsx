'use client';

import { cn } from '@/lib/utils';
import type { StepProps } from './types';

export function Step3Budget({ formData, errors, updateField, t }: StepProps) {
  const isTreasury = formData.category === 'treasury';

  return (
    <div className="space-y-6">
      {/* Budget */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="budget" className="block text-sm font-medium text-gray-900">
            {t('labelBudget')}
          </label>
          {isTreasury ? (
            <span className="text-xs bg-organic-terracotta-light/30 text-organic-terracotta-hover px-2 py-0.5 rounded-full">
              {t('budgetRecommended')}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{t('optional')}</span>
          )}
        </div>
        <textarea
          id="budget"
          value={formData.budget || ''}
          onChange={(e) => updateField('budget', e.target.value)}
          placeholder={t('placeholderBudget')}
          rows={5}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none',
            errors.budget ? 'border-red-300' : 'border-gray-300'
          )}
        />
        {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget[0]}</p>}
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-900">
            {t('labelTimeline')}
          </label>
          <span className="text-xs text-gray-400">{t('optional')}</span>
        </div>
        <textarea
          id="timeline"
          value={formData.timeline || ''}
          onChange={(e) => updateField('timeline', e.target.value)}
          placeholder={t('placeholderTimeline')}
          rows={5}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none',
            errors.timeline ? 'border-red-300' : 'border-gray-300'
          )}
        />
        {errors.timeline && <p className="mt-1 text-sm text-red-600">{errors.timeline[0]}</p>}
      </div>
    </div>
  );
}
