'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FetchErrorBannerProps {
  onRetry?: () => void;
}

export function FetchErrorBanner({ onRetry }: FetchErrorBannerProps) {
  const t = useTranslations('GlobalError');

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{t('title')}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
        >
          <RefreshCw className="h-3 w-3" />
          {t('tryAgain')}
        </button>
      )}
    </div>
  );
}
