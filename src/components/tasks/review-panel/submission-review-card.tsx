'use client';

import { useState } from 'react';
import { Check, X, Loader2, User, Clock } from 'lucide-react';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';
import {
  useReviewSubmission,
  calculateEarnedPoints,
  getQualityMultiplierPercent,
  estimateXpFromPoints,
} from '@/features/tasks';
import { QualityRating } from '../quality-rating';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useCheckLevelUp } from '@/features/reputation';
import { showAchievementToast } from '@/components/reputation/achievement-unlock-toast';
import { showLevelUpToast } from '@/components/reputation/level-up-toast';
import { SubmissionContent } from './submission-content';
import { SubmissionTypeBadge } from './review-badges';

export type ReviewImpactSummary = {
  tone: 'positive' | 'neutral';
  lines: string[];
};

export function SubmissionReviewCard({
  submission,
  basePoints,
  onReviewComplete,
  onImpact,
}: {
  submission: TaskSubmissionWithReviewer;
  basePoints: number;
  onReviewComplete?: () => void;
  onImpact?: (summary: ReviewImpactSummary) => void;
}) {
  const t = useTranslations('Tasks.review');
  const tReputation = useTranslations('Reputation');
  const reviewSubmission = useReviewSubmission();
  const checkLevelUp = useCheckLevelUp();
  const [qualityScore, setQualityScore] = useState<number>(3);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedPoints = calculateEarnedPoints(basePoints, qualityScore);
  const estimatedXp = estimateXpFromPoints(estimatedPoints);

  const maybeResolveAchievementName = (achievementId: string, fallback: string) => {
    try {
      return tReputation(`achievementNames.${achievementId}`);
    } catch {
      return fallback;
    }
  };

  const maybeResolveLevelName = (level: number) => {
    try {
      return tReputation(`levels.${level}`);
    } catch {
      return String(level);
    }
  };

  const runProgressionFeedback = async () => {
    try {
      const result = await checkLevelUp.mutateAsync();
      const newLevelName = maybeResolveLevelName(result.newLevel);

      if (result.leveledUp) {
        showLevelUpToast(result.newLevel, newLevelName, {
          title: tReputation('toast.levelUpTitle'),
          description: tReputation('toast.levelUp', {
            level: result.newLevel,
            name: newLevelName,
          }),
        });
      }

      result.newAchievements.forEach((achievement) => {
        const achievementName = maybeResolveAchievementName(
          achievement.achievement_id,
          achievement.achievement_name
        );
        showAchievementToast(achievementName, achievement.icon, achievement.xp_reward, {
          title: tReputation('toast.achievementUnlockedTitle'),
        });
      });
    } catch {
      // Feedback toasts are best-effort and should not block the review flow
    }
  };

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
      onImpact?.({
        tone: 'positive',
        lines: [
          t('whatChangedPoints', { points: estimatedPoints.toLocaleString() }),
          t('whatChangedXp', { xp: estimatedXp.toLocaleString() }),
          t('whatChangedQuestHint'),
        ],
      });
      await runProgressionFeedback();
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
      onImpact?.({
        tone: 'neutral',
        lines: [t('whatChangedNoRewards'), t('whatChangedDisputeHint')],
      });
      await runProgressionFeedback();
      onReviewComplete?.();
    } catch {
      toast.error(t('rejectFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-organic-terracotta/10 rounded-full flex items-center justify-center">
              <User aria-hidden="true" className="w-4 h-4 text-organic-terracotta" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {submission.user?.name ||
                  (submission.user?.organic_id
                    ? `Organic #${submission.user.organic_id}`
                    : submission.user?.email)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock aria-hidden="true" className="w-3 h-3" />
                {submission.submitted_at
                  ? new Date(submission.submitted_at).toLocaleString()
                  : '-'}
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
        <div className="pt-4 border-t border-border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('qualityScoreLabel')}
          </label>
          <div className="flex items-center gap-4">
            <QualityRating value={qualityScore} onChange={setQualityScore} size="lg" showLabel />
            <span className="text-sm text-gray-500">
              ({t('multiplier', { percent: getQualityMultiplierPercent(qualityScore) })})
            </span>
          </div>
          <p
            className="mt-2 text-sm text-gray-600"
            data-testid={`task-review-impact-estimate-${submission.id}`}
          >
            {t('estimatedPoints')}: <strong>{estimatedPoints}</strong> ({t('base')}: {basePoints})
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {t('estimatedXp')}: <strong>{estimatedXp}</strong>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-transparent resize-none"
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
              data-testid={`task-review-rejection-reason-${submission.id}`}
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
                data-testid={`task-review-reject-${submission.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <X aria-hidden="true" className="w-4 h-4" />
                {t('reject')}
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                data-testid={`task-review-approve-${submission.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="w-4 h-4" />
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
                data-testid={`task-review-confirm-reject-${submission.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                ) : (
                  <X aria-hidden="true" className="w-4 h-4" />
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
