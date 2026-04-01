'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Zap } from 'lucide-react';

const BANNER_DISMISSED_KEY = 'organic_launch_banner_dismissed';

export function LaunchBanner() {
  const t = useTranslations('LaunchBanner');
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
  });

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-organic-terracotta via-amber-500 to-organic-terracotta text-white px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <Zap className="h-4 w-4 animate-pulse" />
        <span>{t('message')}</span>
        <Zap className="h-4 w-4 animate-pulse" />
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(BANNER_DISMISSED_KEY, '1');
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-white/20 transition-colors"
        aria-label={t('dismiss')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
