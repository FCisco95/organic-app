'use client';

import { useTranslations } from 'next-intl';
import { FileText, AlertCircle, Lightbulb, Coins, Clock } from 'lucide-react';
import type { ProposalWithRelations } from '@/features/proposals/types';

interface ProposalSectionsProps {
  proposal: ProposalWithRelations;
}

const SECTION_ICONS = {
  summary: FileText,
  motivation: AlertCircle,
  solution: Lightbulb,
  budget: Coins,
  timeline: Clock,
} as const;

export function ProposalSections({ proposal }: ProposalSectionsProps) {
  const t = useTranslations('ProposalDetail');

  // Check if the proposal has structured sections
  const hasStructuredContent = proposal.summary || proposal.motivation || proposal.solution;

  // Legacy proposals: just show the body
  if (!hasStructuredContent) {
    return (
      <div className="prose max-w-none" data-testid="proposal-sections-legacy">
        <p className="text-gray-700 whitespace-pre-wrap">{proposal.body}</p>
      </div>
    );
  }

  const sections = [
    { key: 'summary' as const, label: t('sectionSummary'), content: proposal.summary },
    { key: 'motivation' as const, label: t('sectionMotivation'), content: proposal.motivation },
    { key: 'solution' as const, label: t('sectionSolution'), content: proposal.solution },
    { key: 'budget' as const, label: t('sectionBudget'), content: proposal.budget },
    { key: 'timeline' as const, label: t('sectionTimeline'), content: proposal.timeline },
  ].filter((s) => s.content);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100"
      data-testid="proposal-sections-structured"
    >
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.key];

        return (
          <div key={section.key} className="px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">{section.label}</h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
