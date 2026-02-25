'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import {
  Vote,
  CheckSquare,
  Fingerprint,
  ArrowRight,
  CalendarClock,
  Gavel,
  Layers,
  Flag,
  ListChecks,
  Trophy,
  ActivitySquare,
} from 'lucide-react';
import { ReputationSummary } from '@/components/reputation/reputation-summary';
import Image from 'next/image';
import { useSprints } from '@/features/sprints';
import { useProposals } from '@/features/proposals';
import { normalizeProposalStatus } from '@/features/proposals/types';
import { useLeaderboard, formatXp } from '@/features/reputation';
import { useActivityFeed } from '@/features/activity';

const CAPABILITIES = [
  {
    titleKey: 'proposalsTitle',
    descKey: 'proposalsDescription',
    icon: Layers,
    href: '/proposals',
  },
  {
    titleKey: 'tasksTitle',
    descKey: 'tasksDescription',
    icon: CheckSquare,
    href: '/tasks',
  },
  {
    titleKey: 'sprintsTitle',
    descKey: 'sprintsDescription',
    icon: CalendarClock,
    href: '/sprints',
  },
  {
    titleKey: 'governanceTitle',
    descKey: 'governanceDescription',
    icon: Gavel,
    href: '/proposals',
  },
  {
    titleKey: 'organicIdTitle',
    descKey: 'organicIdDescription',
    icon: Fingerprint,
    href: '/profile',
  },
] as const;

function formatCountdown(target: string | null | undefined): string {
  if (!target) return '—';
  const targetMs = new Date(target).getTime();
  if (!Number.isFinite(targetMs)) return '—';
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return '0h';

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function Home() {
  const { user, profile } = useAuth();
  const t = useTranslations('Home');
  const { data: sprints = [] } = useSprints();
  const { data: proposals = [] } = useProposals();
  const { data: leaderboard = [] } = useLeaderboard();
  const { data: activity = [] } = useActivityFeed();

  const isAuthenticated = !!user;
  const hasOrganicId = !!profile?.organic_id;

  const inFlightSprint = sprints.find((sprint) =>
    ['active', 'review', 'dispute_window', 'settlement'].includes(sprint.status ?? '')
  );
  const sprintTargetAt =
    inFlightSprint?.status === 'dispute_window'
      ? inFlightSprint.dispute_window_ends_at ?? inFlightSprint.end_at
      : inFlightSprint?.end_at;
  const sprintCountdown = formatCountdown(sprintTargetAt);
  const sprintPhaseLabel = inFlightSprint?.status
    ? String(inFlightSprint.status).replace(/_/g, ' ')
    : null;

  const proposalStageCounts = { public: 0, qualified: 0, discussion: 0, voting: 0 };
  for (const proposal of proposals) {
    const stage = normalizeProposalStatus(proposal.status);
    if (stage in proposalStageCounts) {
      proposalStageCounts[stage as keyof typeof proposalStageCounts] += 1;
    }
  }

  const leaderboardTop = leaderboard.slice(0, 3);

  return (
    <PageContainer layout="fluid" className="relative">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-12 h-64 bg-[radial-gradient(circle_at_top,_hsl(28_100%_50%/0.06),_transparent)]" />

      {/* ── Masthead ─────────────────────────────── */}
      <header className="flex items-center gap-3 mb-6 opacity-0 animate-fade-up stagger-1">
        <Image
          src="/organic-logo.png"
          alt="Organic"
          width={1000}
          height={335}
          className="w-10 h-auto"
          priority
        />
        <div className="h-6 w-px bg-border" />
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t('heroKicker')}
        </span>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-card/70 border border-border px-2.5 py-1 rounded-full">
          {t('heroNetwork')}
        </span>
      </header>

      {/* ── Hero ─────────────────────────────────── */}
      {isAuthenticated && hasOrganicId ? (
        /* Compact hero for returning members */
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-8 opacity-0 animate-fade-up stagger-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t('welcomeBack')}{' '}
                <span className="text-organic-terracotta font-medium">
                  Organic #{profile.organic_id}
                </span>
              </p>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-medium leading-tight text-foreground tracking-tight">
                {t('heroTitle')}{' '}
                <span className="text-organic-terracotta">Organic</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/proposals"
                className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {t('viewProposals')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/tasks"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('viewTasks')} &rarr;
              </Link>
            </div>
          </div>
        </section>
      ) : isAuthenticated && !hasOrganicId ? (
        /* Mid-size hero for users without organic ID */
        <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 mb-8 shadow-sm opacity-0 animate-fade-up stagger-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t('heroLead')}
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium leading-[1.1] text-foreground tracking-tight">
              {t('heroTitle')}{' '}
              <span className="text-organic-terracotta">Organic</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xl">
              {t('heroSubtitle')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/profile"
                className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {t('goToProfile')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-sm text-muted-foreground">{t('holdTokensCallout')}</span>
            </div>
          </div>
        </section>
      ) : (
        /* Full hero for guests */
        <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 lg:p-10 mb-8 shadow-sm opacity-0 animate-fade-up stagger-2">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-organic-terracotta/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-foreground/5 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t('heroLead')}
              </p>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.1] text-foreground tracking-tight">
                {t('heroTitle')}{' '}
                <span className="text-organic-terracotta">Organic</span>
              </h1>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xl">
                {t('heroSubtitle')}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('getStarted')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/proposals"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('viewProposals')} &rarr;
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="rounded-full border border-border px-3 py-1 bg-card/70">
                  {t('heroPillTreasury')}
                </span>
                <span className="rounded-full border border-border px-3 py-1 bg-card/70">
                  {t('heroPillContributors')}
                </span>
                <span className="rounded-full border border-border px-3 py-1 bg-card/70">
                  {t('heroPillOnchain')}
                </span>
              </div>
            </div>

            <div className="relative rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>{t('contractAddress')}</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                  <Vote className="h-3 w-3" />
                  {t('heroVerified')}
                </span>
              </div>
              <code className="mt-3 block break-all rounded-lg bg-foreground text-background text-xs px-3 py-2 font-mono">
                {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
              </code>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {t('heroContractNote')}
              </p>
              <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('heroAccessTitle')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('heroAccessBody')}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Trust Pulse ─────────────────────────────── */}
      <section
        className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-8 opacity-0 animate-fade-up stagger-3"
        data-testid="home-trust-strip"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t('trustTitle')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Sprint countdown */}
          <article
            className="rounded-lg border border-border bg-muted/30 p-4"
            data-testid="trust-card-sprint"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Flag className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('trustSprintTitle')}</span>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">
              {sprintCountdown}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {inFlightSprint
                ? t('trustSprintPhase', { phase: sprintPhaseLabel ?? '—' })
                : t('trustSprintNone')}
            </p>
          </article>

          {/* Proposals by stage */}
          <article
            className="rounded-lg border border-border bg-muted/30 p-4"
            data-testid="trust-card-proposals"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5 text-blue-500" />
              <span>{t('trustProposalTitle')}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <span className="text-muted-foreground">{t('trustProposalPublic', { count: proposalStageCounts.public })}</span>
              <span className="text-muted-foreground">{t('trustProposalQualified', { count: proposalStageCounts.qualified })}</span>
              <span className="text-muted-foreground">{t('trustProposalDiscussion', { count: proposalStageCounts.discussion })}</span>
              <span className="text-muted-foreground">{t('trustProposalVoting', { count: proposalStageCounts.voting })}</span>
            </div>
          </article>

          {/* Leaderboard snapshot */}
          <article
            className="rounded-lg border border-border bg-muted/30 p-4"
            data-testid="trust-card-leaderboard"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-organic-terracotta" />
              <span>{t('trustLeaderboardTitle')}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {leaderboardTop.length === 0 ? (
                <p className="text-muted-foreground">{t('trustLeaderboardEmpty')}</p>
              ) : (
                leaderboardTop.map((entry, index) => (
                  <p key={entry.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">
                      #{index + 1} {entry.name ?? entry.email}
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground text-xs">
                      {formatXp(entry.xp_total)}
                    </span>
                  </p>
                ))
              )}
            </div>
          </article>

          {/* Recent activity count */}
          <article
            className="rounded-lg border border-border bg-muted/30 p-4"
            data-testid="trust-card-activity"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <ActivitySquare className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('trustActivityTitle')}</span>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground">
              {activity.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activity.length > 0
                ? t('trustActivityRecent', { count: activity.length })
                : t('trustActivityEmpty')}
            </p>
          </article>
        </div>

        <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span data-testid="trust-updated-at">
            {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span data-testid="trust-refresh-cadence">60s</span>
        </div>
      </section>

      {/* ── Capabilities + Activity ─────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr] mb-8">
        {/* Capabilities */}
        <div className="opacity-0 animate-fade-up stagger-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {t('capabilitiesTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('capabilitiesSubtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAPABILITIES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.titleKey}
                  href={feature.href}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-organic-terracotta transition-colors">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {t(feature.descKey)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 mt-0.5" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="opacity-0 animate-fade-up stagger-5">
          <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col">
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
              <ActivityFeed />
            </div>
          </div>
        </div>
      </section>

      {/* ── Member Status ───────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-8 opacity-0 animate-fade-up stagger-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {t('statusTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {t('statusDescription')}
            </p>

            {/* Actionable CTAs for logged-in members */}
            {isAuthenticated && hasOrganicId && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/tasks"
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('viewTasks')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('goToProfile')} &rarr;
                </Link>
              </div>
            )}
            {isAuthenticated && !hasOrganicId && (
              <div className="mt-4">
                <Link
                  href="/profile"
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('statusClaimCta')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
            {!isAuthenticated && (
              <div className="mt-4">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('statusCta')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Reputation summary for logged-in users */}
          {isAuthenticated && <ReputationSummary className="lg:w-80 shrink-0" />}
        </div>

        {/* Info cards — shown when not authenticated or no organic ID */}
        {(!isAuthenticated || !hasOrganicId) && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('statusCardOneLabel')}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {t('statusCardOneBody')}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('statusCardTwoLabel')}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {t('statusCardTwoBody')}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('statusCardThreeLabel')}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {t('statusCardThreeBody')}
              </p>
            </div>
          </div>
        )}

        {/* Compact status badges for members with organic ID */}
        {isAuthenticated && hasOrganicId && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1 bg-muted/50">
              {t('statusMember')}
            </span>
            <span className="rounded-full border border-border px-3 py-1 bg-muted/50">
              {t('statusOrganicId')} #{profile.organic_id}
            </span>
            <span className="rounded-full border border-border px-3 py-1 bg-muted/50">
              {t('statusGovernance')}
            </span>
          </div>
        )}
      </section>

      {/* ── Supporting Stats ────────────────────── */}
      <section className="border border-border rounded-lg bg-muted/30 px-5 py-4 mb-6 opacity-0 animate-fade-up stagger-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('supportingStats')}
          </h2>
          <span className="text-[11px] text-muted-foreground/70">
            {t('supportingStatsHint')}
          </span>
        </div>
        <StatsBar />
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="border-t border-border pt-5 pb-2 opacity-0 animate-fade-up stagger-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground/70">
          <span>{t('poweredByOrgDescription')}</span>
          <code className="font-mono text-[11px] text-muted-foreground/70">
            {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
          </code>
        </div>
      </footer>
    </PageContainer>
  );
}
