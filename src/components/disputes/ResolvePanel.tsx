'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useResolveDispute } from '@/features/disputes/hooks';
import type { DisputeResolution } from '@/features/disputes/types';
import { DISPUTE_RESOLUTION_LABELS } from '@/features/disputes/types';
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
    <div className="rounded-lg border-2 border-purple-200 bg-purple-50/30 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-purple-900">
        {t('resolve')}
      </h3>

      {/* Resolution outcome */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          {tf('resolutionOutcome')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setResolution(r)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                resolution === r
                  ? 'border-purple-500 bg-purple-100 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {DISPUTE_RESOLUTION_LABELS[r]}
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
                onClick={() => setQualityScore(score)}
                className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors ${
                  qualityScore === score
                    ? 'border-purple-500 bg-purple-100 text-purple-700'
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
        <p className="text-xs text-gray-400 mt-1">{notes.length}/3000</p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="bg-purple-600 hover:bg-purple-700 text-white"
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
