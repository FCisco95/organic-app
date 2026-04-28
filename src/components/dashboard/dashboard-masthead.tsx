'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { TenantBranding } from '@/lib/tenant/types';
import { LiveIndicator } from './live-indicator';

interface DashboardMastheadProps {
  branding: TenantBranding;
  isAuthenticated: boolean;
}

export function DashboardMasthead({ branding, isAuthenticated }: DashboardMastheadProps) {
  const t = useTranslations('Dashboard.masthead');

  return (
    <section
      data-testid="dashboard-masthead"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <Image
          src={branding.logoUrl}
          alt={branding.communityName}
          width={48}
          height={48}
          className="h-10 w-10 rounded-lg object-cover"
          priority
        />
        <div className="flex flex-col">
          <h1 className="font-display text-2xl text-foreground sm:text-3xl">
            {branding.communityName}
          </h1>
          <LiveIndicator className="mt-1" />
        </div>
      </div>
      {!isAuthenticated && (
        <Link
          href="/signup"
          className="group inline-flex flex-shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-full bg-organic-terracotta px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-organic-terracotta-hover sm:self-auto"
        >
          {t('joinPill', { community: branding.communityName })}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}
