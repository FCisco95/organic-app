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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('linksTitle')}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/pulse"
                className="text-foreground/80 transition-colors hover:text-organic-terracotta"
              >
                {t('linkPulse')}
              </Link>
            </li>
            <li>
              <Link
                href="/stats"
                className="text-foreground/80 transition-colors hover:text-organic-terracotta"
              >
                {t('linkStats')}
              </Link>
            </li>
            <li>
              <Link
                href="/sprints"
                className="text-foreground/80 transition-colors hover:text-organic-terracotta"
              >
                {t('linkSprints')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('socialsTitle')}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {branding.socials.twitter && (
              <li>
                <a
                  href={branding.socials.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-organic-terracotta"
                >
                  {branding.communityHandle ?? branding.communityName}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            )}
            {branding.socials.telegram && (
              <li>
                <a
                  href={branding.socials.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-organic-terracotta"
                >
                  Telegram
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            )}
            {branding.socials.discord && (
              <li>
                <a
                  href={branding.socials.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-organic-terracotta"
                >
                  Discord
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            )}
          </ul>
        </div>

        {!isAuthenticated && (
          <div className="flex flex-col justify-center rounded-xl border border-organic-terracotta/30 bg-organic-terracotta/5 p-4">
            <p className="text-sm text-muted-foreground">{branding.tagline}</p>
            <Link
              href="/signup"
              className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-organic-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-organic-terracotta-hover"
            >
              {t('joinCta', { community: branding.communityName })}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {showPoweredBy && (
        <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground/70">
          {t('poweredBy')}
        </p>
      )}
    </footer>
  );
}
