'use client';

import { useTranslations } from 'next-intl';
import { Activity, CheckCircle2, Coins, Vote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardStatStrip } from '@/features/dashboard/types';
import { CountUpNumber } from './count-up-number';

interface DashboardStatStripProps {
  stats: DashboardStatStrip;
}

interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
}

function StatTile({ label, value, icon: Icon }: StatTileProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground/50" aria-hidden />
      </div>
      <CountUpNumber value={value} className="mt-2 block text-2xl font-bold text-foreground" />
    </article>
  );
}

export function DashboardStatStripSection({ stats }: DashboardStatStripProps) {
  const t = useTranslations('Dashboard.statStrip');
  return (
    <section
      data-testid="dashboard-stat-strip"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      aria-label={t('activeMembers24h')}
    >
      <StatTile label={t('activeMembers24h')} value={stats.activeMembers24h} icon={Activity} />
      <StatTile
        label={t('pointsDistributed')}
        value={stats.pointsDistributedThisSprint}
        icon={Coins}
      />
      <StatTile
        label={t('tasksShipped')}
        value={stats.tasksShippedThisSprint}
        icon={CheckCircle2}
      />
      <StatTile label={t('openProposals')} value={stats.openProposals} icon={Vote} />
    </section>
  );
}
