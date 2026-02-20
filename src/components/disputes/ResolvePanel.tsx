'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useResolveDispute } from '@/features/disputes/hooks';
import type { DisputeResolution } from '@/features/disputes/types';
import { Loader2 } from 'lucide-react';

const RESOLUTIONS: DisputeResolution[] = ['overturned', 'upheld', 'compromise', 'dismissed'];

interface ResolvePanelProps {
  disputeId: string;
  onSuccess?: () => void;
}

export function ResolvePanel({ disputeId, onSuccess }: ResolvePanelProps) {
  const t = useTranslations('Disputes');
  const tf = useTranslations('Disputes.form');
  const resolve = useResolveDispute();

  const [resolution, setResolution] = useState<DisputeResolution | ''>('');
  const [notes, setNotes] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);

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
        <div className="grid grid-cols-2 gap-2">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResolution(r)}
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        <p className="text-xs text-gray-400 mt-1">{notes.length}/3000</p>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        {resolve.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {t('resolve')}
      </Button>

      {resolve.isError && (
        <p className="text-sm text-red-600">{resolve.error.message}</p>
      )}
    </div>
  );
}
