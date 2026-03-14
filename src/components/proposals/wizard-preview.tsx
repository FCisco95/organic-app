'use client';

import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { CreateProposalInput } from '@/features/proposals/schemas';
import type { ProposalCategory } from '@/features/proposals/types';
import {
  PROPOSAL_CATEGORY_COLORS,
  PROPOSAL_CATEGORY_BORDER_COLORS,
} from '@/features/proposals/types';
import { CategoryBadge } from './category-badge';

interface WizardPreviewProps {
  formData: CreateProposalInput;
}

function PreviewSection({
  label,
  content,
  emptyText,
}: {
  label: string;
  content: string;
  emptyText: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = content.trim().length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
      className="w-full text-left cursor-pointer"
    >
      <div className="flex items-center gap-2 py-2">
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {hasContent && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
        )}
      </div>
      {expanded && (
        <div className="pl-6 pb-2 ml-1">
          {hasContent ? (
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-6">
              {content}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">{emptyText}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function WizardPreview({ formData }: WizardPreviewProps) {
  const t = useTranslations('ProposalWizard');
  const category = formData.category as ProposalCategory;
  const borderColor = PROPOSAL_CATEGORY_BORDER_COLORS[category];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        {t('previewTitle')}
      </h3>

      {/* Mini proposal card preview */}
      <div
        className={cn(
          'rounded-xl border border-slate-200 bg-white overflow-hidden',
          'border-l-4',
          borderColor
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar placeholder */}
            <div
              className={cn(
                'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                PROPOSAL_CATEGORY_COLORS[category]
              )}
              aria-hidden="true"
            >
              <FileText className="h-3.5 w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Category badge */}
              <div className="mb-1.5">
                <CategoryBadge category={category} />
              </div>

              {/* Title */}
              <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">
                {formData.title || (
                  <span className="text-gray-300">{t('previewPlaceholderTitle')}</span>
                )}
              </h4>

              {/* Summary */}
              <p className="mt-1 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {formData.summary || (
                  <span className="text-gray-300">{t('previewPlaceholderSummary')}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable section previews */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 divide-y divide-gray-100">
        <PreviewSection
          label={t('labelMotivation')}
          content={formData.motivation}
          emptyText={t('previewNotYetWritten')}
        />
        <PreviewSection
          label={t('labelSolution')}
          content={formData.solution}
          emptyText={t('previewNotYetWritten')}
        />
        <PreviewSection
          label={t('labelBudget')}
          content={formData.budget || ''}
          emptyText={t('previewNotYetWritten')}
        />
        <PreviewSection
          label={t('labelTimeline')}
          content={formData.timeline || ''}
          emptyText={t('previewNotYetWritten')}
        />
      </div>
    </div>
  );
}
