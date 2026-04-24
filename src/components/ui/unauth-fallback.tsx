'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface UnauthFallbackProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  returnTo?: string;
  className?: string;
}

export function UnauthFallback({
  icon: Icon,
  title,
  description,
  returnTo,
  className,
}: UnauthFallbackProps) {
  const t = useTranslations('UnauthFallback');

  const suffix = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
  const signInHref = `/login${suffix}` as const;
  const signUpHref = `/signup${suffix}` as const;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 sm:p-10 text-center',
        className,
      )}
      data-testid="unauth-fallback"
    >
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <Link
          href={signInHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cta px-4 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
        >
          {t('signInCta')}
        </Link>
        <Link
          href={signUpHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t('signUpCta')}
        </Link>
      </div>
    </div>
  );
}
