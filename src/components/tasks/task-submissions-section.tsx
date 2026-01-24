'use client';

import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';

type TaskSubmissionsSectionProps = {
  submissions: TaskSubmissionWithReviewer[];
  getDisplayName: (user: TaskSubmissionWithReviewer['user']) => string;
};

export function TaskSubmissionsSection({
  submissions,
  getDisplayName,
}: TaskSubmissionsSectionProps) {
  const t = useTranslations('TaskDetail');

  if (submissions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('submissions')} ({submissions.length})
      </h2>

      <div className="space-y-4">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            getDisplayName={getDisplayName}
          />
        ))}
      </div>
    </div>
  );
}

function SubmissionCard({
  submission,
  getDisplayName,
}: {
  submission: TaskSubmissionWithReviewer;
  getDisplayName: (user: TaskSubmissionWithReviewer['user']) => string;
}) {
  const t = useTranslations('TaskDetail');

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-yellow-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
    disputed: <AlertCircle className="w-4 h-4 text-purple-500" />,
  };

  const statusColors = {
    pending: 'bg-yellow-50 border-yellow-200',
    approved: 'bg-green-50 border-green-200',
    rejected: 'bg-red-50 border-red-200',
    disputed: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[submission.review_status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon[submission.review_status]}
            <span className="font-medium text-gray-900">
              {t(`reviewStatus.${submission.review_status}`)}
            </span>
            {submission.quality_score && (
              <span className="text-sm text-gray-500">
                ({t('qualityScore')}: {submission.quality_score}/5)
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-2">
            {t('submittedBy')} <span className="font-medium">{getDisplayName(submission.user)}</span>{' '}
            {t('on')} {new Date(submission.submitted_at).toLocaleDateString()}
          </div>

          {submission.description && (
            <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
          )}

          {submission.pr_link && (
            <a
              href={submission.pr_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-organic-orange hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t('viewPullRequest')}
            </a>
          )}

          {submission.content_link && (
            <a
              href={submission.content_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-organic-orange hover:underline ml-2"
            >
              <ExternalLink className="w-3 h-3" />
              {t('viewContent')}
            </a>
          )}

          {submission.file_urls && submission.file_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {submission.file_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-organic-orange hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {t('file')} {idx + 1}
                </a>
              ))}
            </div>
          )}

          {submission.reviewer_notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700">{t('reviewerNotes')}:</p>
              <p className="text-sm text-gray-600 mt-1">{submission.reviewer_notes}</p>
            </div>
          )}

          {submission.rejection_reason && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-red-700">{t('rejectionReason')}:</p>
              <p className="text-sm text-red-600 mt-1">{submission.rejection_reason}</p>
            </div>
          )}

          {submission.earned_points !== null && submission.earned_points > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                +{submission.earned_points} {t('pointsEarned')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
