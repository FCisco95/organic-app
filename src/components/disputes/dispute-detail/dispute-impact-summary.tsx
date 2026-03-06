'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { DisputeActionImpactSummary } from '../resolve-panel';

interface DisputeImpactSummaryProps {
  summary: DisputeActionImpactSummary;
}

export function DisputeImpactSummary({ summary }: DisputeImpactSummaryProps) {
  const t = useTranslations('Disputes');

  return (
    <div
      data-testid="dispute-action-impact-summary"
      className={cn(
        'rounded-lg border px-3 py-2 text-xs',
        summary.tone === 'positive'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      )}
    >
      <p className="font-semibold">{t('impact.whatChangedTitle')}</p>
      <ul className="mt-1 space-y-1">
        {summary.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
