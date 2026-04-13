'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { ContributionLayout } from '@/components/home/contribution-layout';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useState, useEffect } from 'react';
import {
  Vote,
  ArrowRight,
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
import { cn } from '@/lib/utils';
import { useActivityFeed } from '@/features/activity';
import { GovernanceSummaryCard } from '@/components/analytics/governance-summary-card';
import { HowItWorksCard } from '@/components/dashboard/how-it-works-card';
import { CampaignCarousel } from '@/components/home/campaign-carousel';

function formatCountdown(target: string | null | undefined): string {
  if (!target) return '';
  const targetMs = new Date(target).getTime();
  if (!Number.isFinite(targetMs)) return '';
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return '';

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

/** Renders only on the client to avoid hydration mismatch from Date.now() */
function ClientTime() {
  const [time, setTime] = useState('');
  useEffect(() => {
    setTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
  }, []);
  return <>{time || '\u00A0'}</>;
}

export default function Home() {
  const { user, profile } = useAuth();
  const t = useTranslations('Home');
  const { data: sprints = [] } = useSprints();
  const { data: proposals = [] } = useProposals();
  const { data: leaderboard = [], isError: leaderboardError } = useLeaderboard();
  const { data: activity = [] } = useActivityFeed();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

      {/* -- Masthead -- */}
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

      {/* TODO: Migrate to <PageHero> — custom grid layout with contract address panel, blur effects, and landing page structure doesn't fit current PageHero props */}
      {/* -- Hero -- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 lg:p-10 mb-8 shadow-sm opacity-0 animate-fade-up stagger-2 text-white">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-organic-terracotta-lightest0/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
              {t('heroLead')}
            </p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-[1.1] text-white tracking-tight">
              {t('heroTitle')}{' '}
              <span className="text-[#E8845C] animate-organic-grow inline-block">Organic</span>
            </h1>
            <p className="mt-4 text-base text-gray-300 leading-relaxed max-w-xl">
              {t('heroSubtitle')}
            </p>

            {!isAuthenticated && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('getStarted')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/proposals"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  {t('viewProposals')} &rarr;
                </Link>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-400">
              <span className="rounded-full border border-white/10 px-3 py-1 bg-white/5">
                {t('heroPillTreasury')}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 bg-white/5">
                {t('heroPillContributors')}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 bg-white/5">
                {t('heroPillOnchain')}
              </span>
            </div>
          </div>

          <div className="relative rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
              <span>{t('contractAddress')}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-300">
                <Vote className="h-3 w-3" />
                {t('heroVerified')}
              </span>
            </div>
            <code className="mt-3 block break-all rounded-lg bg-black/40 text-gray-200 text-xs px-3 py-2 font-mono">
              {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
            </code>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              {t('heroContractNote')}
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                {t('heroAccessTitle')}
              </p>
              <p className="mt-1 text-sm text-gray-300">
                {t('heroAccessBody')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -- Campaign Carousel -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-3">
        <CampaignCarousel />
      </section>

      {/* -- Trust Pulse -- */}
      <section
        className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-8 opacity-0 animate-fade-up stagger-4"
        data-testid="home-trust-strip"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t('trustTitle')}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Sprint countdown */}
          <article
            className="rounded-lg border border-border bg-amber-500/5 p-4 hover:border-amber-500/30 transition-colors"
            data-testid="trust-card-sprint"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Flag className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('trustSprintTitle')}</span>
            </div>
            <p className={cn(
              'mt-2 font-bold font-mono tabular-nums animate-count-up',
              inFlightSprint ? 'text-2xl text-foreground' : 'text-sm text-muted-foreground'
            )}>
              {inFlightSprint
                ? (mounted ? (sprintCountdown || t('trustSprintEnding')) : '\u00A0')
                : t('trustSprintNoneShort')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {inFlightSprint
                ? (sprintCountdown
                    ? t('trustSprintPhase', { phase: sprintPhaseLabel ?? '\u2014' })
                    : t('trustSprintEndingDesc'))
                : t('trustSprintNone')}
            </p>
          </article>

          {/* Proposals by stage */}
          <article
            className="rounded-lg border border-border bg-blue-500/5 p-4 hover:border-blue-500/30 transition-colors"
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
          <Link href="/community" className="block">
          <article
            className="rounded-lg border border-border bg-organic-terracotta-lightest0/5 p-4 hover:border-organic-terracotta/30 transition-colors"
            data-testid="trust-card-leaderboard"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-organic-terracotta" />
              <span>{t('trustLeaderboardTitle')}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {leaderboardError ? (
                <p className="text-sm text-destructive">Rankings temporarily unavailable</p>
              ) : leaderboardTop.length === 0 ? (
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

          </Link>

          {/* Recent activity count */}
          <article
            className="rounded-lg border border-border bg-emerald-500/5 p-4 hover:border-emerald-500/30 transition-colors"
            data-testid="trust-card-activity"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <ActivitySquare className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('trustActivityTitle')}</span>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-foreground animate-count-up">
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
            <ClientTime />
          </span>
          <span data-testid="trust-refresh-cadence">60s</span>
        </div>
      </section>

      {/* -- How It Works -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-5">
        <HowItWorksCard />
      </section>

      {/* -- AI Governance Summary -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-6">
        <GovernanceSummaryCard variant="compact" />
      </section>

      {/* -- Contribution Layout (nav cards + activity feed) -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-7">
        <ContributionLayout
          proposalCount={proposalStageCounts.public + proposalStageCounts.qualified + proposalStageCounts.discussion + proposalStageCounts.voting}
          sprintActive={!!inFlightSprint}
          activityCount={activity.length}
        />
      </section>

      {/* -- Member Status -- */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-8 opacity-0 animate-fade-up stagger-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {t('statusTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {t('statusDescription')}
            </p>

            {isAuthenticated && hasOrganicId && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/tasks"
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:scale-[1.01]"
                >
                  {t('viewTasks')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('goToProfile')}
                </Link>
              </div>
            )}
            {isAuthenticated && !hasOrganicId && (
              <div className="mt-4">
                <Link
                  href="/profile"
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:scale-[1.01]"
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
                  className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:scale-[1.01]"
                >
                  {t('statusCta')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>

          {isAuthenticated && <ReputationSummary className="lg:w-80 shrink-0" />}
        </div>

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

      {/* -- Supporting Stats -- */}
      <section className="border border-border rounded-lg bg-muted/30 px-5 py-4 mb-6 opacity-0 animate-fade-up stagger-9">
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

      {/* -- Footer -- */}
      <footer className="border-t border-border pt-5 pb-2 opacity-0 animate-fade-up stagger-10">
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
