'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { TenantBranding } from '@/lib/tenant/types';

interface DashboardFooterProps {
  branding: TenantBranding;
  isAuthenticated: boolean;
}

export function DashboardFooter({ branding, isAuthenticated }: DashboardFooterProps) {
  const t = useTranslations('Dashboard.footer');
  const showPoweredBy = !branding.isPlatformOwner;

  return (
    <footer
      data-testid="dashboard-footer"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <nav aria-label={t('linksTitle')}>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
            {t('linksTitle')}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <li>
              <Link
                href="/pulse"
                className="text-foreground/80 transition-colors hover:text-organic-terracotta motion-reduce:transition-none"
              >
                {t('linkPulse')}
              </Link>
            </li>
            <li>
              <Link
                href="/stats"
                className="text-foreground/80 transition-colors hover:text-organic-terracotta motion-reduce:transition-none"
              >
                {t('linkStats')}
              </Link>
            </li>
            <li>
              <Link
                href="/sprints"
                className="text-foreground/80 transition-colors hover:text-organic-terracotta motion-reduce:transition-none"
              >
                {t('linkSprints')}
              </Link>
            </li>
          </ul>
        </nav>

        {!isAuthenticated && branding.tagline && (
          <div className="flex flex-col rounded-xl border border-organic-terracotta/30 bg-organic-terracotta/5 p-4 sm:max-w-sm">
            <p className="text-sm text-muted-foreground">{branding.tagline}</p>
            <Link
              href="/signup"
              className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-organic-terracotta-hover px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-organic-terracotta-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-organic-terracotta/40 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              {t('joinCta', { community: branding.communityName })}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {branding.footerNote && (
        <p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground/80">
          {branding.footerNote}
        </p>
      )}

      {showPoweredBy && (
        <p
          className={`text-center text-xs text-muted-foreground/70 ${branding.footerNote ? 'mt-2' : 'mt-5 border-t border-border pt-4'}`}
        >
          {t('poweredBy')}
        </p>
      )}
    </footer>
  );
}
