'use client';

import { useTranslations } from 'next-intl';
import type { DisputeWithRelations } from '@/features/disputes/types';

interface DisputeOriginalReviewProps {
  submission: NonNullable<DisputeWithRelations['submission']>;
}

export function DisputeOriginalReview({ submission }: DisputeOriginalReviewProps) {
  const td = useTranslations('Disputes.detail');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{td('originalReview')}</h3>
      <div className="space-y-1 text-sm text-gray-700">
        {submission.quality_score && (
          <p>
            {td('qualityScore')}: {submission.quality_score}/5
          </p>
        )}
        {submission.rejection_reason && (
          <p>
            {td('rejectionReason')}: {submission.rejection_reason}
          </p>
        )}
        {submission.reviewer_notes && (
          <p className="italic text-gray-500">{submission.reviewer_notes}</p>
        )}
      </div>
    </div>
  );
}
