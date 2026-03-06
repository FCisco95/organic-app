'use client';

import { X, User, MessageSquare } from 'lucide-react';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';
import { QualityRating } from '../quality-rating';
import { useTranslations } from 'next-intl';
import { SubmissionContent } from './submission-content';
import { ReviewStatusBadge } from './review-badges';

export function SubmissionHistoryCard({
  submission,
}: {
  submission: TaskSubmissionWithReviewer;
}) {
  const t = useTranslations('Tasks.review');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User aria-hidden="true" className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {submission.user?.name ||
                  (submission.user?.organic_id
                    ? `Organic #${submission.user.organic_id}`
                    : submission.user?.email)}
              </p>
              <p className="text-xs text-gray-500">
                {t('submitted')}{' '}
                {submission.submitted_at
                  ? new Date(submission.submitted_at).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>
          <ReviewStatusBadge status={submission.review_status ?? 'pending'} />
        </div>
      </div>

      {/* Content Summary */}
      <div className="p-4 space-y-3">
        <SubmissionContent submission={submission} compact />

        {/* Review Details */}
        {submission.quality_score && (
          <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
            <QualityRating value={submission.quality_score} readonly size="sm" showLabel />
            {submission.earned_points !== null && (
              <span className="text-sm font-medium text-green-600">
                +{submission.earned_points} pts
              </span>
            )}
          </div>
        )}

        {submission.reviewer_notes && (
          <div className="flex items-start gap-2 text-sm">
            <MessageSquare aria-hidden="true" className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="text-gray-600">{submission.reviewer_notes}</p>
          </div>
        )}

        {submission.rejection_reason && (
          <div className="flex items-start gap-2 text-sm bg-red-50 p-3 rounded-lg">
            <X aria-hidden="true" className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-red-700">{submission.rejection_reason}</p>
          </div>
        )}

        {submission.reviewer && (
          <p className="text-xs text-gray-500">
            {t('reviewedBy')}{' '}
            {submission.reviewer.name ||
              (submission.reviewer.organic_id
                ? `Organic #${submission.reviewer.organic_id}`
                : submission.reviewer.email)}{' '}
            {t('on')} {new Date(submission.reviewed_at!).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
