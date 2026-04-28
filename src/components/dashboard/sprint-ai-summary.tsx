'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import type { SprintAiSummary } from '@/features/dashboard/types';

interface SprintAiSummaryCardProps {
  summary: SprintAiSummary;
}

export function SprintAiSummaryCard({ summary }: SprintAiSummaryCardProps) {
  const t = useTranslations('Dashboard.sprintHero');
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-organic-terracotta/10 p-2">
          <Sparkles className="h-4 w-4 text-organic-terracotta" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('summaryHeading')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{summary.text}</p>
          {summary.themes.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {summary.themes.map((theme) => (
                <li
                  key={theme}
                  className="inline-flex items-center rounded-full bg-organic-terracotta/10 px-2.5 py-0.5 text-xs font-medium text-organic-terracotta"
                >
                  {theme}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
