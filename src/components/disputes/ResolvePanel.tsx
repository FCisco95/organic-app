'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useResolveDispute } from '@/features/disputes/hooks';
import type { DisputeResolution } from '@/features/disputes/types';
import { Loader2 } from 'lucide-react';
import { calculateEarnedPoints, estimateXpFromPoints } from '@/features/tasks';

const RESOLUTIONS: DisputeResolution[] = ['overturned', 'upheld', 'compromise', 'dismissed'];

export type DisputeActionImpactSummary = {
  tone: 'positive' | 'neutral';
  lines: string[];
};

interface ResolvePanelProps {
  disputeId: string;
  basePoints: number;
  xpStake: number;
  reviewerPenaltyXp: number;
  arbitratorRewardXp: number;
  hasArbitrator: boolean;
  onImpact?: (summary: DisputeActionImpactSummary) => void;
  onPostAction?: () => Promise<void> | void;
  onSuccess?: () => void;
}

export function ResolvePanel({
  disputeId,
  basePoints,
  xpStake,
  reviewerPenaltyXp,
  arbitratorRewardXp,
  hasArbitrator,
  onImpact,
  onPostAction,
  onSuccess,
}: ResolvePanelProps) {
  const t = useTranslations('Disputes');
  const tf = useTranslations('Disputes.form');
  const resolve = useResolveDispute();

  const [resolution, setResolution] = useState<DisputeResolution | ''>('');
  const [notes, setNotes] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);

  const compromisePoints =
    qualityScore === null ? 0 : calculateEarnedPoints(basePoints, qualityScore);
  const compromiseXp = estimateXpFromPoints(compromisePoints);
  const overturnedXp = estimateXpFromPoints(basePoints);

  const buildImpactLines = (selected: DisputeResolution): string[] => {
    if (selected === 'overturned') {
      return [
        t('impact.disputantRefundLine', { xp: xpStake.toLocaleString() }),
        t('impact.reviewerPenaltyLine', { xp: reviewerPenaltyXp.toLocaleString() }),
        hasArbitrator
          ? t('impact.arbitratorRewardLine', { xp: arbitratorRewardXp.toLocaleString() })
          : t('impact.arbitratorNoRewardLine'),
        t('impact.submissionApprovalLine', {
          score: 5,
          points: basePoints.toLocaleString(),
          xp: overturnedXp.toLocaleString(),
        }),
        t('impact.questHintLine'),
      ];
    }

    if (selected === 'compromise') {
      return [
        t('impact.disputantRefundLine', { xp: xpStake.toLocaleString() }),
        t('impact.reviewerNoPenaltyLine'),
        hasArbitrator
          ? t('impact.arbitratorRewardLine', { xp: arbitratorRewardXp.toLocaleString() })
          : t('impact.arbitratorNoRewardLine'),
        t('impact.submissionApprovalLine', {
          score: qualityScore ?? 3,
          points: compromisePoints.toLocaleString(),
          xp: compromiseXp.toLocaleString(),
        }),
        t('impact.questHintLine'),
      ];
    }

    return [
      t('impact.disputantStakeLockedLine'),
      hasArbitrator
        ? t('impact.arbitratorRewardLine', { xp: arbitratorRewardXp.toLocaleString() })
        : t('impact.arbitratorNoRewardLine'),
      t('impact.noNetXpLine'),
    ];
  };

  const handleSubmit = async () => {
    if (!resolution || notes.length < 10) return;

    try {
      await resolve.mutateAsync({
        disputeId,
        input: {
          resolution,
          resolution_notes: notes,
          new_quality_score: resolution === 'compromise' ? qualityScore : null,
        },
      });
      onImpact?.({
        tone: resolution === 'overturned' || resolution === 'compromise' ? 'positive' : 'neutral',
        lines: buildImpactLines(resolution),
      });
      await onPostAction?.();
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };

  const canSubmit =
    resolution &&
    notes.length >= 10 &&
    (resolution !== 'compromise' || qualityScore !== null) &&
    !resolve.isPending;

  return (
    <div data-testid="dispute-resolve-panel" className="space-y-4 rounded-xl border-2 border-orange-200 bg-orange-50/40 p-5">
      <h3 className="text-sm font-semibold text-orange-900">
        {t('resolve')}
      </h3>
      <p className="text-xs text-orange-800">{tf('resolutionGuardrail')}</p>

      {/* Resolution outcome */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          {tf('resolutionOutcome')}
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResolution(r)}
              data-testid={`dispute-resolve-option-${r}`}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                resolution === r
                  ? 'border-orange-500 bg-orange-100 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {t(`resolution.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Quality score for compromise */}
      {resolution === 'compromise' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            {tf('newQualityScore')}
          </label>
          <p className="text-xs text-gray-500 mb-2">{tf('newQualityScoreHint')}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setQualityScore(score)}
                className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors ${
                  qualityScore === score
                    ? 'border-orange-500 bg-orange-100 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resolution notes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          {tf('resolutionNotes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tf('resolutionNotesPlaceholder')}
          rows={3}
          maxLength={3000}
          data-testid="dispute-resolve-notes"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        <p className="text-xs text-gray-400 mt-1">{notes.length}/3000</p>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        data-testid="dispute-resolve-submit"
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        {resolve.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {t('resolve')}
      </Button>

      {resolution && (
        <div
          data-testid="dispute-resolve-impact-estimate"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <p className="font-semibold">{t('impact.estimateTitle')}</p>
          <ul className="mt-1 space-y-1">
            {buildImpactLines(resolution).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {resolve.isError && (
        <p className="text-sm text-red-600">{resolve.error.message}</p>
      )}
    </div>
  );
}
