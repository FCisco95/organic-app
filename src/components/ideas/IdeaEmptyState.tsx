'use client';

import { useTranslations } from 'next-intl';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IdeaEmptyStateProps {
  onCreateClick?: () => void;
}

export function IdeaEmptyState({ onCreateClick }: IdeaEmptyStateProps) {
  const t = useTranslations('Ideas');

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Rocket className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{t('emptyTitle')}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('emptyDescription')}</p>
      {onCreateClick && (
        <Button
          onClick={onCreateClick}
          className="mt-5"
          variant="cta"
        >
          {t('emptyCta')}
        </Button>
      )}
    </div>
  );
}
