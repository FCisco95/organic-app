'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight, Check } from 'lucide-react';
import type { TenantBranding } from '@/lib/tenant/types';

interface AnonymousJoinCardProps {
  branding: TenantBranding;
}

export function AnonymousJoinCard({ branding }: AnonymousJoinCardProps) {
  const t = useTranslations('Dashboard.invitation');
  return (
    <article className="flex h-full flex-col rounded-2xl border border-organic-terracotta/30 bg-gradient-to-br from-organic-terracotta/8 to-transparent p-6">
      <h2 className="font-display text-2xl text-foreground">
        {t('title', { community: branding.communityName })}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('lead')}</p>
      <ul className="mt-5 space-y-2.5">
        {[t('bullet1'), t('bullet2'), t('bullet3')].map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-sm text-foreground/90">
            <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-organic-terracotta/15 text-organic-terracotta">
              <Check className="h-3 w-3" aria-hidden />
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className="mt-auto inline-flex w-fit items-center gap-2 pt-6 text-sm font-semibold text-organic-terracotta hover:text-organic-terracotta-hover"
      >
        {t('cta')}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
