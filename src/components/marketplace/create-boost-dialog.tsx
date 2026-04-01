'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Coins, Link2, Users } from 'lucide-react';
import { useCreateBoost } from '@/features/marketplace/hooks';

interface CreateBoostDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBoostDialog({ open, onClose }: CreateBoostDialogProps) {
  const t = useTranslations('Marketplace');
  const { mutateAsync: createBoost, isPending } = useCreateBoost();
  const [tweetUrl, setTweetUrl] = useState('');
  const [pointsOffered, setPointsOffered] = useState(10);
  const [maxEngagements, setMaxEngagements] = useState(5);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createBoost({
        tweet_url: tweetUrl,
        points_offered: pointsOffered,
        max_engagements: maxEngagements,
      });
      setTweetUrl('');
      setPointsOffered(10);
      setMaxEngagements(5);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create boost');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-card p-6 shadow-xl ring-1 ring-border mx-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('createBoostTitle')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tweet URL */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              {t('tweetUrlLabel')}
            </label>
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://x.com/user/status/..."
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/50"
            />
          </div>

          {/* Points offered */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              <Coins className="h-4 w-4 text-amber-500" />
              {t('pointsLabel')}
            </label>
            <input
              type="number"
              min={5}
              max={1000}
              value={pointsOffered}
              onChange={(e) => setPointsOffered(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/50"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{t('pointsHint')}</p>
          </div>

          {/* Max engagements */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              <Users className="h-4 w-4 text-blue-500" />
              {t('maxEngagementsLabel')}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxEngagements}
              onChange={(e) => setMaxEngagements(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {t('cancelAction')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-cta text-cta-fg py-2 text-sm font-medium hover:bg-cta-hover disabled:opacity-50 transition-colors"
            >
              {isPending ? t('creating') : t('createBoost')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
