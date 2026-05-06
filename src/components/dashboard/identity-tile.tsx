'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { TenantBranding } from '@/lib/tenant/types';
import { SocialIconRow } from './social-icon-row';
import { LiveIndicator } from './live-indicator';

interface IdentityTileProps {
  branding: TenantBranding;
  isAuthenticated: boolean;
  /** Optional aggregate "active members in last 24h" pulled from stats. */
  activeMembers24h?: number;
}

export function IdentityTile({
  branding,
  isAuthenticated,
  activeMembers24h,
}: IdentityTileProps) {
  const t = useTranslations('Dashboard.identityTile');
  const tMast = useTranslations('Dashboard.masthead');
  const accent = branding.accentPrimary;

  // Radial brand glow keyed off the tenant's primary HSL color. Tinted softly
  // so the card has depth without competing with the token tile.
  const tileStyle = {
    backgroundImage: `radial-gradient(120% 80% at 0% 0%, hsl(${accent} / 0.16), transparent 55%), radial-gradient(80% 60% at 100% 100%, hsl(${accent} / 0.06), transparent 70%)`,
  } as const;

  return (
    <section
      data-testid="identity-tile"
      aria-labelledby="dashboard-identity-name"
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7"
      style={tileStyle}
    >
      {branding.bannerUrl && (
        <div className="absolute inset-x-0 top-0 -z-0 h-24 overflow-hidden opacity-40">
          <Image
            src={branding.bannerUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
            loading="lazy"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card" />
        </div>
      )}

      <div className="relative z-10 flex items-start gap-5">
        <div
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-background shadow-sm sm:h-20 sm:w-20"
          style={{ boxShadow: `0 0 0 1px hsl(${accent} / 0.35)` }}
        >
          <Image
            src={branding.logoUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              id="dashboard-identity-name"
              className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl"
            >
              {branding.communityName}
            </h1>
            {branding.communityHandle && (
              <span className="text-sm text-muted-foreground">{branding.communityHandle}</span>
            )}
          </div>
          {branding.tagline && (
            <p className="mt-1 max-w-xl text-sm text-foreground/80 sm:text-base">
              {branding.tagline}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <LiveIndicator />
            {typeof activeMembers24h === 'number' && activeMembers24h > 0 && (
              <span data-testid="identity-active-members">
                {t('activeMembers', { count: activeMembers24h })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3">
        <SocialIconRow socials={branding.socials} communityName={branding.communityName} />
        {!isAuthenticated && (
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full bg-organic-terracotta-hover px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-organic-terracotta-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-organic-terracotta/40 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            {tMast('joinPill', { community: branding.communityName })}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        )}
      </div>
    </section>
  );
}
