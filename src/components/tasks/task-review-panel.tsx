'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';
import { useTranslations } from 'next-intl';
import {
  SubmissionReviewCard,
  SubmissionHistoryCard,
  type ReviewImpactSummary,
} from './review-panel';

interface TaskReviewPanelProps {
  submissions: TaskSubmissionWithReviewer[];
  basePoints: number;
  onReviewComplete?: () => void;
  className?: string;
}

export function TaskReviewPanel({
  submissions,
  basePoints,
  onReviewComplete,
  className,
}: TaskReviewPanelProps) {
  const t = useTranslations('Tasks.review');
  const pendingSubmissions = submissions.filter((s) => s.review_status === 'pending');
  const reviewedSubmissions = submissions.filter((s) => s.review_status !== 'pending');
  const [lastImpactSummary, setLastImpactSummary] = useState<ReviewImpactSummary | null>(null);

  return (
    <div className={cn('space-y-6', className)} data-testid="task-review-panel">
      {lastImpactSummary && (
        <div
          data-testid="task-review-last-impact"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            lastImpactSummary.tone === 'positive'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          )}
        >
          <p className="font-semibold">{t('whatChangedTitle')}</p>
          <ul className="mt-1 space-y-1">
            {lastImpactSummary.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Submissions */}
      {pendingSubmissions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            {t('pendingReview')} ({pendingSubmissions.length})
          </h3>
          <div className="space-y-4">
            {pendingSubmissions.map((submission) => (
              <SubmissionReviewCard
                key={submission.id}
                submission={submission}
                basePoints={basePoints}
                onReviewComplete={onReviewComplete}
                onImpact={setLastImpactSummary}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Submissions */}
      {reviewedSubmissions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('reviewHistory')} ({reviewedSubmissions.length})
          </h3>
          <div className="space-y-4">
            {reviewedSubmissions.map((submission) => (
              <SubmissionHistoryCard key={submission.id} submission={submission} />
            ))}
          </div>
        </div>
      )}

      {submissions.length === 0 && (
        <div className="text-center py-8 text-gray-500">{t('noSubmissions')}</div>
      )}
    </div>
  );
}
