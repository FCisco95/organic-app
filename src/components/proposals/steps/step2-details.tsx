'use client';

import { cn } from '@/lib/utils';
import type { StepProps } from './types';

export function Step2Details({ formData, errors, updateField, t }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Motivation */}
      <div>
        <label htmlFor="motivation" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelMotivation')}
        </label>
        <textarea
          id="motivation"
          value={formData.motivation}
          onChange={(e) => updateField('motivation', e.target.value)}
          placeholder={t('placeholderMotivation')}
          rows={6}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.motivation ? 'border-red-300' : 'border-gray-300'
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.motivation ? (
            <p className="text-sm text-red-600">{errors.motivation[0]}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-500">
            {t('charCountNoMax', { count: formData.motivation.length })}
          </p>
        </div>
      </div>

      {/* Solution */}
      <div>
        <label htmlFor="solution" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelSolution')}
        </label>
        <textarea
          id="solution"
          value={formData.solution}
          onChange={(e) => updateField('solution', e.target.value)}
          placeholder={t('placeholderSolution')}
          rows={6}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.solution ? 'border-red-300' : 'border-gray-300'
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.solution ? (
            <p className="text-sm text-red-600">{errors.solution[0]}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-500">
            {t('charCountNoMax', { count: formData.solution.length })}
          </p>
        </div>
      </div>
    </div>
  );
}
