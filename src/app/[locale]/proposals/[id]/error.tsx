'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

export default function ProposalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Error');

  // Next.js reports error boundary errors automatically — no manual logging needed.
  void error;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm max-w-md w-full">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t('proposalTitle')}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t('proposalDescription')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-organic-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-organic-terracotta-hover transition-colors"
          >
            {t('retry')}
          </button>
          <Link
            href="/proposals"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToProposals')}
          </Link>
        </div>
      </div>
    </div>
  );
}
