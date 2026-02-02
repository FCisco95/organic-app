'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { StatsBar } from '@/components/dashboard/stats-bar';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const t = useTranslations('Home');

  return (
    <PageContainer>
      {/* Hero */}
      <section className="-mx-6 lg:-mx-8 px-6 lg:px-8 pt-10 pb-10 bg-gradient-to-b from-orange-50/60 via-white to-transparent">
        <div className="max-w-2xl">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-organic-orange to-orange-500 bg-clip-text text-transparent">
              Organic
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-lg">
            {t('description')}
          </p>

          {/* CTAs — unauthenticated */}
          {!user && (
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/25"
              >
                {t('getStarted')}
              </Link>
            </div>
          )}

          {/* CTAs — authenticated, no Organic ID */}
          {user && !profile?.organic_id && (
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/profile"
                className="inline-flex items-center bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/25"
              >
                {t('goToProfile')}
              </Link>
              <p className="text-sm text-gray-500">{t('holdTokensCallout')}</p>
            </div>
          )}

          {/* CTAs — authenticated, has Organic ID */}
          {user && profile?.organic_id && (
            <div className="mt-8">
              <p className="text-sm font-medium text-gray-600 mb-4">
                {t('welcomeBack')}{' '}
                <strong className="text-gray-900">Organic #{profile.organic_id}</strong>
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/proposals"
                  className="inline-flex items-center bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/25"
                >
                  {t('viewProposals')}
                </Link>
                <Link
                  href="/tasks"
                  className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  {t('viewTasks')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {([
          { emoji: '📝', titleKey: 'proposalsTitle', descKey: 'proposalsDescription' },
          { emoji: '✅', titleKey: 'tasksTitle', descKey: 'tasksDescription' },
          { emoji: '🎫', titleKey: 'organicIdTitle', descKey: 'organicIdDescription' },
        ] as const).map((card) => (
          <div
            key={card.titleKey}
            className="group relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/70 transition-all duration-200 hover:shadow-lg hover:ring-orange-200/60 hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/80 text-xl shadow-sm ring-1 ring-orange-200/50">
              {card.emoji}
            </div>
            <h3 className="text-base font-semibold text-gray-900 tracking-tight">
              {t(card.titleKey)}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              {t(card.descKey)}
            </p>
          </div>
        ))}
      </section>

      {/* Dashboard — stats + activity in a unified section */}
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Dashboard</h2>
        <StatsBar />
        <ActivityFeed />
      </section>

      {/* Powered by $ORG */}
      <section className="mt-10 mb-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/[0.04]">
        <h2 className="text-base font-semibold text-gray-900">{t('poweredByOrg')}</h2>
        <p className="mt-1 text-sm text-gray-500 max-w-2xl leading-relaxed">
          {t('poweredByOrgDescription')}
        </p>
        <div className="mt-4 inline-flex flex-col rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-950/[0.04]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {t('contractAddress')}
          </span>
          <code className="mt-0.5 text-xs text-gray-600 break-all">
            {process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || t('loading')}
          </code>
        </div>
      </section>
    </PageContainer>
  );
}
