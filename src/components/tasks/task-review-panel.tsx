'use client';

import { useState } from 'react';
import {
  Check,
  X,
  ExternalLink,
  Loader2,
  User,
  Clock,
  MessageSquare,
  FileText,
  Code,
  Palette,
  Eye,
  ThumbsUp,
  Share2,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TaskSubmissionWithReviewer,
  useReviewSubmission,
  calculateEarnedPoints,
  getQualityMultiplierPercent,
} from '@/features/tasks';
import { QualityRating } from './quality-rating';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

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

  return (
    <div className={cn('space-y-6', className)}>
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

// Submission Review Card (for pending submissions)
function SubmissionReviewCard({
  submission,
  basePoints,
  onReviewComplete,
}: {
  submission: TaskSubmissionWithReviewer;
  basePoints: number;
  onReviewComplete?: () => void;
}) {
  const t = useTranslations('Tasks.review');
  const reviewSubmission = useReviewSubmission();
  const [qualityScore, setQualityScore] = useState<number>(3);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedPoints = calculateEarnedPoints(basePoints, qualityScore);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await reviewSubmission.mutateAsync({
        submissionId: submission.id,
        review: {
          quality_score: qualityScore as 1 | 2 | 3 | 4 | 5,
          reviewer_notes: reviewerNotes || undefined,
          action: 'approve',
        },
      });
      toast.success(t('approved'));
      onReviewComplete?.();
    } catch {
      toast.error(t('approveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(t('rejectionReasonRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewSubmission.mutateAsync({
        submissionId: submission.id,
        review: {
          quality_score: qualityScore as 1 | 2 | 3 | 4 | 5,
          reviewer_notes: reviewerNotes || undefined,
          action: 'reject',
          rejection_reason: rejectionReason,
        },
      });
      toast.success(t('rejected'));
      onReviewComplete?.();
    } catch {
      toast.error(t('rejectFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-organic-orange/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-organic-orange" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {submission.user?.name ||
                  (submission.user?.organic_id
                    ? `Organic #${submission.user.organic_id}`
                    : submission.user?.email)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '-'}
              </p>
            </div>
          </div>
          <SubmissionTypeBadge type={submission.submission_type} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <SubmissionContent submission={submission} />

        {/* Quality Rating */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('qualityScoreLabel')}
          </label>
          <div className="flex items-center gap-4">
            <QualityRating value={qualityScore} onChange={setQualityScore} size="lg" showLabel />
            <span className="text-sm text-gray-500">
              ({t('multiplier', { percent: getQualityMultiplierPercent(qualityScore) })})
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {t('estimatedPoints')}: <strong>{estimatedPoints}</strong> ({t('base')}: {basePoints})
          </p>
        </div>

        {/* Reviewer Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('reviewerNotesLabel')}
          </label>
          <textarea
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            rows={2}
            placeholder={t('reviewerNotesPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
          />
        </div>

        {/* Rejection Reason (shown when rejecting) */}
        {isRejecting && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('rejectionReasonLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={2}
              placeholder={t('rejectionReasonPlaceholder')}
              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {!isRejecting ? (
            <>
              <button
                onClick={() => setIsRejecting(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {t('reject')}
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('approve')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsRejecting(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {t('confirmReject')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Submission History Card (for reviewed submissions)
function SubmissionHistoryCard({ submission }: { submission: TaskSubmissionWithReviewer }) {
  const t = useTranslations('Tasks.review');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
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
            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="text-gray-600">{submission.reviewer_notes}</p>
          </div>
        )}

        {submission.rejection_reason && (
          <div className="flex items-start gap-2 text-sm bg-red-50 p-3 rounded-lg">
            <X className="w-4 h-4 text-red-500 mt-0.5" />
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
            on {new Date(submission.reviewed_at!).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

// Submission Content Display
function SubmissionContent({
  submission,
  compact = false,
}: {
  submission: TaskSubmissionWithReviewer;
  compact?: boolean;
}) {
  const t = useTranslations('Tasks.review');
  const type = submission.submission_type;
  const customFields = submission.custom_fields as Record<
    string,
    string | number | boolean | null
  > | null;
  const customLink =
    customFields && typeof customFields.link === 'string' ? customFields.link : null;

  return (
    <div className="space-y-3">
      {/* Development */}
      {type === 'development' && submission.pr_link && (
        <div>
          <a
            href={submission.pr_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <Code className="w-4 h-4" />
            {t('viewPullRequest')}
            <ExternalLink className="w-3 h-3" />
          </a>
          {!compact && submission.testing_notes && (
            <p className="mt-2 text-sm text-gray-600">
              <strong>{t('testing')}:</strong> {submission.testing_notes}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {type === 'content' && (
        <div>
          {submission.content_link && (
            <a
              href={submission.content_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <FileText className="w-4 h-4" />
              {t('viewContent')}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {!compact && submission.content_text && (
            <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
              {submission.content_text}
            </p>
          )}
          {submission.reach_metrics && (
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              {(submission.reach_metrics as Record<string, number>).views !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {(submission.reach_metrics as Record<string, number>).views} views
                </span>
              )}
              {(submission.reach_metrics as Record<string, number>).likes !== undefined && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {(submission.reach_metrics as Record<string, number>).likes} likes
                </span>
              )}
              {(submission.reach_metrics as Record<string, number>).shares !== undefined && (
                <span className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  {(submission.reach_metrics as Record<string, number>).shares} shares
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Design */}
      {type === 'design' && submission.file_urls && (
        <div>
          <ul className="space-y-1">
            {submission.file_urls.map((url, index) => (
              <li key={index}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Palette className="w-4 h-4" />
                  {t('designFile', { index: index + 1 })}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
          {!compact && submission.revision_notes && (
            <p className="mt-2 text-sm text-gray-600">
              <strong>{t('revisionNotes')}:</strong> {submission.revision_notes}
            </p>
          )}
        </div>
      )}

      {/* Custom */}
      {type === 'custom' && (
        <div>
          {customLink && (
            <a
              href={customLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <LinkIcon className="w-4 h-4" />
              {t('viewSubmission')}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {!compact && customFields && (
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              {Object.entries(customFields)
                .filter(([key, value]) => key !== 'link' && value !== null && value !== '')
                .map(([key, value]) => (
                  <p key={key}>
                    <strong className="capitalize">{key}:</strong> {String(value)}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Description (all types) */}
      {!compact && submission.description && (
        <p className="text-sm text-gray-700">{submission.description}</p>
      )}
    </div>
  );
}

// Helper Components
function SubmissionTypeBadge({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    development: Code,
    content: FileText,
    design: Palette,
    custom: FileText,
  };
  const Icon = icons[type] || FileText;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
      <Icon className="w-3 h-3" />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    disputed: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        colors[status] || 'bg-gray-100 text-gray-700'
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
