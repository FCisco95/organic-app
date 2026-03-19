'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { FeatureCarousel } from '@/components/home/feature-carousel';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useState, useEffect } from 'react';
import {
  Vote,
  ArrowRight,
} from 'lucide-react';
import { ReputationSummary } from '@/components/reputation/reputation-summary';
import Image from 'next/image';
import { useSprints } from '@/features/sprints';
import { useProposals } from '@/features/proposals';
import { normalizeProposalStatus } from '@/features/proposals/types';
import { useLeaderboard } from '@/features/reputation';
import { cn } from '@/lib/utils';
import { useActivityFeed } from '@/features/activity';

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


export default function Home() {
  const { user, profile } = useAuth();
  const t = useTranslations('Home');
  const { data: sprints = [] } = useSprints();
  const { data: proposals = [] } = useProposals();
  const { data: leaderboard = [] } = useLeaderboard();
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
      <div className="pointer-events-none absolute inset-x-0 -top-12 h-96 bg-[radial-gradient(ellipse_600px_400px_at_15%_50%,var(--orange-dim),transparent),radial-gradient(ellipse_400px_300px_at_85%_30%,rgba(168,85,247,0.06),transparent)]" />

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

      {/* -- Dark Gradient Hero (B's style with orange "Organic" + C's structure) -- */}
      {isAuthenticated && hasOrganicId ? (
        /* Compact hero for returning members */
        <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 mb-8 opacity-0 animate-fade-up stagger-2 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                {t('welcomeBack')}{' '}
                <span className="text-orange-500 font-medium">
                  Organic #{profile.organic_id}
                </span>
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-display font-bold leading-tight text-white tracking-tight">
                {t('heroTitle')}{' '}
                <span className="text-orange-500 animate-organic-grow inline-block">Organic</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/proposals"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[var(--orange)] to-[#ff8844] hover:shadow-[0_8px_24px_var(--orange-glow)] text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
              >
                {t('viewProposals')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/tasks"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                {t('viewTasks')} &rarr;
              </Link>
            </div>
          </div>
        </section>
      ) : isAuthenticated && !hasOrganicId ? (
        /* Mid-size hero for users without organic ID */
        <section className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 mb-8 shadow-sm opacity-0 animate-fade-up stagger-2 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
              {t('heroLead')}
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-display font-bold leading-[1.1] text-white tracking-tight">
              {t('heroTitle')}{' '}
              <span className="text-orange-500 animate-organic-grow inline-block">Organic</span>
            </h1>
            <p className="mt-4 text-base text-gray-300 leading-relaxed max-w-xl">
              {t('heroSubtitle')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/profile"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[var(--orange)] to-[#ff8844] hover:shadow-[0_8px_24px_var(--orange-glow)] text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
              >
                {t('goToProfile')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-sm text-gray-400">{t('holdTokensCallout')}</span>
            </div>
          </div>
        </section>
      ) : (
        /* Full hero for guests */
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 lg:p-10 mb-8 shadow-sm opacity-0 animate-fade-up stagger-2 text-white">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[var(--orange-dim)] blur-3xl" />

          {/* Floating character emojis */}
          <div className="hidden xl:block absolute right-6 bottom-6 z-10">
            <div className="flex gap-4">
              <span className="text-5xl drop-shadow-lg" style={{ animation: 'charBob 5s ease-in-out infinite' }}>🤖</span>
              <span className="text-5xl drop-shadow-lg" style={{ animation: 'charBob 5s ease-in-out infinite -1.5s' }}>🐉</span>
              <span className="text-5xl drop-shadow-lg" style={{ animation: 'charBob 5s ease-in-out infinite -3s' }}>🦊</span>
            </div>
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                {t('heroLead')}
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-display font-bold leading-[1.1] text-white tracking-tight">
                {t('heroTitle')}{' '}
                <span className="text-orange-500 animate-organic-grow inline-block">Organic</span>
              </h1>
              <p className="mt-4 text-base text-gray-300 leading-relaxed max-w-xl">
                {t('heroSubtitle')}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-[var(--orange)] to-[#ff8844] hover:shadow-[0_8px_24px_var(--orange-glow)] text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                >
                  {t('getStarted')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/proposals"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-dim)] hover:text-white border border-[hsl(var(--border))] bg-[var(--surface2)] px-5 py-2.5 rounded-xl transition-all hover:border-[var(--orange)] hover:-translate-y-0.5"
                >
                  {t('viewProposals')} →
                </Link>
              </div>

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
      )}

      {/* -- Trust Pulse -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-3" data-testid="home-trust-strip">
        <div className="section-label-line mb-4">{t('trustTitle')}</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Sprint countdown */}
          <article className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] p-5" data-testid="trust-card-sprint">
            <div className="card-shimmer" />
            <div className="text-base mb-1.5">⏳</div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-dimmer)] font-semibold mb-1.5">
              {t('trustSprintTitle')}
            </div>
            <p className={cn(
              'font-bold font-mono tabular-nums animate-count-up text-[var(--orange)]',
              inFlightSprint ? 'text-2xl' : 'text-sm text-[var(--text-dim)]'
            )}>
              {inFlightSprint
                ? (mounted ? (sprintCountdown || t('trustSprintEnding')) : '\u00A0')
                : t('trustSprintNoneShort')}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-dim)]">
              {inFlightSprint
                ? (sprintCountdown
                    ? t('trustSprintPhase', { phase: sprintPhaseLabel ?? '\u2014' })
                    : t('trustSprintEndingDesc'))
                : t('trustSprintNone')}
            </p>
          </article>

          {/* Proposals by stage */}
          <article className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] p-5" data-testid="trust-card-proposals">
            <div className="card-shimmer" />
            <div className="text-base mb-1.5">📋</div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-dimmer)] font-semibold mb-1.5">
              {t('trustProposalTitle')}
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--green)]">
              {proposalStageCounts.public + proposalStageCounts.qualified + proposalStageCounts.discussion + proposalStageCounts.voting}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-dim)]">
              {t('trustProposalPublic', { count: proposalStageCounts.public })} · {t('trustProposalVoting', { count: proposalStageCounts.voting })}
            </p>
          </article>

          {/* Leaderboard snapshot */}
          <Link href="/community" className="block">
            <article className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] p-5" data-testid="trust-card-leaderboard">
              <div className="card-shimmer" />
              <div className="text-base mb-1.5">🏆</div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-dimmer)] font-semibold mb-1.5">
                {t('trustLeaderboardTitle')}
              </div>
              {leaderboardTop.length === 0 ? (
                <p className="text-sm text-[var(--text-dim)]">{t('trustLeaderboardEmpty')}</p>
              ) : (
                <p className="text-2xl font-bold font-mono tabular-nums text-[var(--purple)]">
                  #1 {leaderboardTop[0]?.name ?? leaderboardTop[0]?.email}
                </p>
              )}
              <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                {leaderboardTop.slice(1).map((e, i) => `#${i + 2} ${e.name ?? e.email}`).join(' · ')}
              </p>
            </article>
          </Link>

          {/* Recent activity count */}
          <article className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] p-5" data-testid="trust-card-activity">
            <div className="card-shimmer" />
            <div className="text-base mb-1.5">🔥</div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-dimmer)] font-semibold mb-1.5">
              {t('trustActivityTitle')}
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--cyan)]">
              {activity.length}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-dim)]">
              {activity.length > 0
                ? t('trustActivityRecent', { count: activity.length })
                : t('trustActivityEmpty')}
            </p>
          </article>
        </div>
      </section>

      {/* -- Feature Carousel (FOMO cards) -- 1 card at a time */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-4">
        <div className="section-label-line mb-4">{t('capabilitiesTitle')}</div>
        <FeatureCarousel />
      </section>

      {/* -- Activity Feed -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-5">
        <div className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] p-6 flex flex-col">
          <div className="card-shimmer" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              ⚡ {t('whatsHappening')}
            </h2>
            <span className="live-badge-pulse bg-[var(--red)] text-white text-[9px] font-bold uppercase tracking-[1px] px-2 py-1 rounded">
              {t('activityLive')}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ActivityFeed />
          </div>
        </div>
      </section>

      {/* -- Member Status -- */}
      <section className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] p-6 sm:p-8 mb-8 opacity-0 animate-fade-up stagger-6 relative overflow-hidden">
        <div className="card-shimmer" />
        {/* Radial glow accent */}
        <div className="absolute -top-1/4 -right-1/5 w-[400px] h-[400px] bg-[radial-gradient(circle,var(--orange-dim),transparent_70%)] pointer-events-none" />
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
                  className="group inline-flex items-center gap-2 btn-game-primary px-4 py-2 text-sm"
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
                  className="group inline-flex items-center gap-2 btn-game-primary px-4 py-2 text-sm"
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
                  className="group inline-flex items-center gap-2 btn-game-primary px-4 py-2 text-sm"
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
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[var(--surface2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('statusCardOneLabel')}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {t('statusCardOneBody')}
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[var(--surface2)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('statusCardTwoLabel')}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {t('statusCardTwoBody')}
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[var(--surface2)] p-4">
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
            <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 bg-[var(--surface2)] text-[var(--text-dim)]">
              ✅ {t('statusMember')}
            </span>
            <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 bg-[var(--surface2)] text-[var(--text-dim)]">
              🏛️ {t('statusOrganicId')} #{profile.organic_id}
            </span>
            <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 bg-[var(--surface2)] text-[var(--text-dim)]">
              🔓 {t('statusGovernance')}
            </span>
          </div>
        )}
      </section>

      {/* -- Supporting Stats -- */}
      <section className="mb-8 opacity-0 animate-fade-up stagger-7">
        <div className="section-label-line mb-4">{t('supportingStats')}</div>
        <StatsBar />
      </section>

      {/* -- Footer -- */}
      <footer className="border-t border-[hsl(var(--border))] pt-5 pb-2 opacity-0 animate-fade-up stagger-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[var(--text-dimmer)]">
          <span>{t('poweredByOrgDescription')}</span>
          <code className="font-mono text-[11px] text-muted-foreground/70">
            {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
          </code>
        </div>
      </footer>
    </PageContainer>
  );
}
