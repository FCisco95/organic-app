'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import {
  ScrollText,
  CheckSquare,
  Timer,
  BarChart3,
  Landmark,
  Trophy,
  ArrowRight,
} from 'lucide-react';

interface NavCard {
  id: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  href: string;
  badgeKey: string;
}

const NAV_CARDS: NavCard[] = [
  {
    id: 'proposals',
    titleKey: 'carouselProposalsTitle',
    descKey: 'navProposalsDesc',
    icon: ScrollText,
    href: '/proposals',
    badgeKey: 'navProposalsBadge',
  },
  {
    id: 'tasks',
    titleKey: 'carouselTasksTitle',
    descKey: 'navTasksDesc',
    icon: CheckSquare,
    href: '/tasks',
    badgeKey: 'navTasksBadge',
  },
  {
    id: 'sprints',
    titleKey: 'carouselSprintsTitle',
    descKey: 'navSprintsDesc',
    icon: Timer,
    href: '/sprints',
    badgeKey: 'navSprintsBadge',
  },
  {
    id: 'analytics',
    titleKey: 'carouselAnalyticsTitle',
    descKey: 'navAnalyticsDesc',
    icon: BarChart3,
    href: '/analytics',
    badgeKey: 'navAnalyticsBadge',
  },
  {
    id: 'treasury',
    titleKey: 'carouselTreasuryTitle',
    descKey: 'navTreasuryDesc',
    icon: Landmark,
    href: '/treasury',
    badgeKey: 'navTreasuryBadge',
  },
  {
    id: 'leaderboard',
    titleKey: 'carouselLeaderboardTitle',
    descKey: 'navLeaderboardDesc',
    icon: Trophy,
    href: '/community',
    badgeKey: 'navLeaderboardBadge',
  },
];

interface ContributionLayoutProps {
  proposalCount: number;
  sprintActive: boolean;
  activityCount: number;
}

export function ContributionLayout({
  proposalCount,
  sprintActive,
  activityCount,
}: ContributionLayoutProps) {
  const t = useTranslations('Home');

  const badgeValues: Record<string, string> = {
    proposals: proposalCount > 0 ? t('navProposalsBadgeCount', { count: proposalCount }) : t('navProposalsBadge'),
    tasks: t('navTasksBadge'),
    sprints: sprintActive ? t('navSprintsActiveBadge') : t('navSprintsBadge'),
    analytics: t('navAnalyticsBadge'),
    treasury: t('navTreasuryBadge'),
    leaderboard: t('navLeaderboardBadge'),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
      {/* Left column: Quick-nav cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t('capabilitiesTitle')}
        </h2>
        {NAV_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link key={card.id} href={card.href} className="block group">
              <div
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted opacity-0 animate-fade-up"
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground group-hover:text-orange-500 transition-colors truncate">
                      {t(card.titleKey)}
                    </p>
                    <span className="shrink-0 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                      {badgeValues[card.id]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {t(card.descKey)}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Right column: Activity feed */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('whatsHappening')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('activitySubtitle')}
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
            {t('activityLive')}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <ActivityFeed maxItems={8} />
        </div>
      </div>
    </div>
  );
}
