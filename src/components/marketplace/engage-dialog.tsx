'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Repeat2, MessageCircle } from 'lucide-react';
import { useSubmitProof } from '@/features/marketplace/hooks';
import { cn } from '@/lib/utils';

interface EngageDialogProps {
  open: boolean;
  boostId: string;
  onClose: () => void;
}

const PROOF_TYPES = [
  { type: 'like' as const, icon: Heart, color: 'text-red-500' },
  { type: 'retweet' as const, icon: Repeat2, color: 'text-emerald-500' },
  { type: 'comment' as const, icon: MessageCircle, color: 'text-blue-500' },
] as const;

export function EngageDialog({ open, boostId, onClose }: EngageDialogProps) {
  const t = useTranslations('Marketplace');
  const { mutateAsync: submitProof, isPending } = useSubmitProof();
  const [proofType, setProofType] = useState<'like' | 'retweet' | 'comment'>('like');
  const [proofUrl, setProofUrl] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await submitProof({
        boostId,
        proof_type: proofType,
        proof_url: proofUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit proof');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-card p-6 shadow-xl ring-1 ring-border mx-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('submitProofTitle')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proof type selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('proofTypeLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROOF_TYPES.map(({ type, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProofType(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors',
                    proofType === type
                      ? 'border-organic-terracotta bg-organic-terracotta-lightest dark:bg-organic-terracotta-lightest0/10'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <Icon className={cn('h-5 w-5', color)} />
                  <span className="text-xs font-medium capitalize">{t(`proofType.${type}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional proof URL */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('proofUrlLabel')}
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder={t('proofUrlPlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-organic-terracotta/50"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{t('proofUrlHint')}</p>
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
              {isPending ? t('submitting') : t('submitProof')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
