'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { Vote, CheckSquare, Fingerprint, ArrowRight, CalendarClock, Gavel, Layers } from 'lucide-react';
import Image from 'next/image';

const CAPABILITIES = [
  {
    titleKey: 'proposalsTitle',
    descKey: 'proposalsDescription',
    icon: Layers,
    href: '/proposals',
    tone: 'from-amber-100/70 via-white to-white',
  },
  {
    titleKey: 'tasksTitle',
    descKey: 'tasksDescription',
    icon: CheckSquare,
    href: '/tasks',
    tone: 'from-slate-100/80 via-white to-white',
  },
  {
    titleKey: 'sprintsTitle',
    descKey: 'sprintsDescription',
    icon: CalendarClock,
    href: '/sprints',
    tone: 'from-orange-100/70 via-white to-white',
  },
  {
    titleKey: 'governanceTitle',
    descKey: 'governanceDescription',
    icon: Gavel,
    href: '/proposals',
    tone: 'from-neutral-100/80 via-white to-white',
  },
  {
    titleKey: 'organicIdTitle',
    descKey: 'organicIdDescription',
    icon: Fingerprint,
    href: '/profile',
    tone: 'from-amber-100/60 via-white to-white',
  },
] as const;

export default function Home() {
  const { user, profile } = useAuth();
  const t = useTranslations('Home');

  return (
    <PageContainer width="wide" className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-12 h-64 bg-[radial-gradient(circle_at_top,_rgba(255,122,0,0.18),_rgba(255,255,255,0))]" />

      {/* ── Masthead ─────────────────────────────── */}
      <header className="flex items-center gap-3 mb-8 opacity-0 animate-fade-up stagger-1">
        <Image
          src="/organic-logo.png"
          alt="Organic"
          width={1000}
          height={335}
          className="w-10 h-auto"
          priority
        />
        <div className="h-6 w-px bg-gray-200" />
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">
          {t('heroKicker')}
        </span>
        <span className="ml-auto text-xs font-medium text-gray-500 bg-white/70 border border-gray-200 px-2.5 py-1 rounded-full">
          {t('heroNetwork')}
        </span>
      </header>

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-[linear-gradient(135deg,_#f5f0e6_0%,_#f7f7f2_40%,_#fff7ed_100%)] p-6 sm:p-8 lg:p-10 mb-12 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.5)] opacity-0 animate-fade-up stagger-2">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(255,122,0,0.4),_rgba(255,255,255,0))]" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(15,23,42,0.15),_rgba(255,255,255,0))]" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            {user && profile?.organic_id ? (
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                {t('welcomeBack')} <span className="text-orange-600">Organic #{profile.organic_id}</span>
              </p>
            ) : (
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                {t('heroLead')}
              </p>
            )}
            <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.1] text-gray-900 tracking-tight">
              {t('heroTitle')} <span className="text-orange-600">Organic</span>
            </h1>
            <p className="mt-4 text-base text-gray-600 leading-relaxed max-w-xl">
              {t('heroSubtitle')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!user && (
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('getStarted')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
              {user && !profile?.organic_id && (
                <>
                  <Link
                    href="/profile"
                    className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('goToProfile')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <span className="text-sm text-gray-500">{t('holdTokensCallout')}</span>
                </>
              )}
              {user && profile?.organic_id && (
                <>
                  <Link
                    href="/proposals"
                    className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('viewProposals')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/tasks"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {t('viewTasks')} &rarr;
                  </Link>
                </>
              )}
              {!user && (
                <Link
                  href="/proposals"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t('viewProposals')} &rarr;
                </Link>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-500">
              <span className="rounded-full border border-gray-200 px-3 py-1 bg-white/70">
                {t('heroPillTreasury')}
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1 bg-white/70">
                {t('heroPillContributors')}
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1 bg-white/70">
                {t('heroPillOnchain')}
              </span>
            </div>
          </div>

          <div className="relative rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-500">
              <span>{t('contractAddress')}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-600">
                <Vote className="h-3 w-3" />
                {t('heroVerified')}
              </span>
            </div>
            <code className="mt-3 block break-all rounded-lg bg-gray-900 text-white text-xs px-3 py-2 font-mono">
              {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
            </code>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              {t('heroContractNote')}
            </p>
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                {t('heroAccessTitle')}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {t('heroAccessBody')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities + Activity ─────────────── */}
      <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr] mb-12">
        <div className="opacity-0 animate-fade-up stagger-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
            {t('capabilitiesTitle')}
          </h2>
          <p className="text-sm text-gray-600 max-w-2xl mb-6">
            {t('capabilitiesSubtitle')}
          </p>

          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible">
            {CAPABILITIES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.titleKey}
                  href={feature.href}
                  className={`group min-w-[240px] md:min-w-0 rounded-2xl border border-gray-200 bg-gradient-to-br ${feature.tone} p-5 shadow-[0_20px_40px_-36px_rgba(15,23,42,0.5)] transition-transform hover:-translate-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {t(feature.descKey)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="opacity-0 animate-fade-up stagger-4">
          <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {t('whatsHappening')}
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  {t('activitySubtitle')}
                </p>
              </div>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                {t('activityLive')}
              </span>
            </div>
            <ActivityFeed />
          </div>
        </div>
      </section>

      {/* ── Member Status ───────────────────────── */}
      <section className="rounded-3xl border border-gray-200 bg-[linear-gradient(120deg,_#ffffff_0%,_#f8fafc_45%,_#fff7ed_100%)] p-6 sm:p-8 mb-12 opacity-0 animate-fade-up stagger-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('statusTitle')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl">
              {t('statusDescription')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!user && (
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {t('statusCta')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            {user && !profile?.organic_id && (
              <Link
                href="/profile"
                className="group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {t('statusClaimCta')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            {user && profile?.organic_id && (
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-500">
                <span className="rounded-full border border-gray-200 px-3 py-1 bg-white">
                  {t('statusMember')}
                </span>
                <span className="rounded-full border border-gray-200 px-3 py-1 bg-white">
                  {t('statusOrganicId')} #{profile.organic_id}
                </span>
                <span className="rounded-full border border-gray-200 px-3 py-1 bg-white">
                  {t('statusGovernance')}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
              {t('statusCardOneLabel')}
            </p>
            <p className="mt-2 text-sm text-gray-700">
              {t('statusCardOneBody')}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
              {t('statusCardTwoLabel')}
            </p>
            <p className="mt-2 text-sm text-gray-700">
              {t('statusCardTwoBody')}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
              {t('statusCardThreeLabel')}
            </p>
            <p className="mt-2 text-sm text-gray-700">
              {t('statusCardThreeBody')}
            </p>
          </div>
        </div>
      </section>

      {/* ── Supporting Stats ────────────────────── */}
      <section className="border border-gray-200 rounded-2xl bg-gray-50/70 px-5 py-4 mb-6 opacity-0 animate-fade-up stagger-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            {t('supportingStats')}
          </h2>
          <span className="text-[11px] text-gray-400">
            {t('supportingStatsHint')}
          </span>
        </div>
        <StatsBar />
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="border-t border-gray-200 pt-5 pb-2 opacity-0 animate-fade-up stagger-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-gray-400">
          <span>{t('poweredByOrgDescription')}</span>
          <code className="font-mono text-[11px] text-gray-400">
            {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
          </code>
        </div>
      </footer>
    </PageContainer>
  );
}
