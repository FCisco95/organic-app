'use client';

import {
  Lightbulb,
  Scale,
  Wallet,
  Users,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProposalCategory } from '@/features/proposals/types';
import {
  PROPOSAL_CATEGORIES,
  PROPOSAL_CATEGORY_LABELS,
  PROPOSAL_CATEGORY_COLORS,
} from '@/features/proposals/types';
import type { StepProps } from './types';

// Icon map for category cards
const CATEGORY_ICON_MAP: Record<ProposalCategory, LucideIcon> = {
  feature: Lightbulb,
  governance: Scale,
  treasury: Wallet,
  community: Users,
  development: Code,
};

export function Step1Category({ formData, errors, updateField, t }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          {t('selectCategory')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROPOSAL_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat];
            const isSelected = formData.category === cat;
            const colorClass = PROPOSAL_CATEGORY_COLORS[cat];

            return (
              <button
                key={cat}
                type="button"
                onClick={() => updateField('category', cat)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-organic-orange bg-orange-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className={cn('p-2 rounded-lg', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{PROPOSAL_CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t(`categoryDescription_${cat}`)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelTitle')}
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder={t('placeholderTitle')}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent',
            errors.title ? 'border-red-300' : 'border-gray-300'
          )}
          maxLength={200}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? <p className="text-sm text-red-600">{errors.title[0]}</p> : <span />}
          <p className="text-xs text-gray-500">
            {t('charCount', { count: formData.title.length, max: 200 })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-900 mb-2">
          {t('labelSummary')}
        </label>
        <textarea
          id="summary"
          value={formData.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder={t('placeholderSummary')}
          rows={3}
          className={cn(
            'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none',
            errors.summary ? 'border-red-300' : 'border-gray-300'
          )}
          maxLength={300}
        />
        <div className="flex justify-between mt-1">
          {errors.summary ? <p className="text-sm text-red-600">{errors.summary[0]}</p> : <span />}
          <p className="text-xs text-gray-500">
            {t('charCount', { count: formData.summary.length, max: 300 })}
          </p>
        </div>
      </div>
    </div>
  );
}
