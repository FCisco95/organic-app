'use client';

import { useTranslations } from 'next-intl';
import { Compass, Home, ListChecks, Vote, Users, ArrowLeft } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { PageContainer } from '@/components/layout';

const suggestedPages = [
  {
    href: '/' as const,
    icon: Home,
    titleKey: 'cards.home.title' as const,
    descKey: 'cards.home.desc' as const,
  },
  {
    href: '/tasks' as const,
    icon: ListChecks,
    titleKey: 'cards.tasks.title' as const,
    descKey: 'cards.tasks.desc' as const,
  },
  {
    href: '/proposals' as const,
    icon: Vote,
    titleKey: 'cards.proposals.title' as const,
    descKey: 'cards.proposals.desc' as const,
  },
  {
    href: '/community' as const,
    icon: Users,
    titleKey: 'cards.members.title' as const,
    descKey: 'cards.members.desc' as const,
  },
];

export default function NotFound() {
  const t = useTranslations('NotFound');
  const router = useRouter();

  return (
    <PageContainer width="narrow">
      <div className="flex flex-col items-center py-12 sm:py-20">
        {/* Illustration zone */}
        <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-2xl bg-muted sm:h-40 sm:w-40">
          <Compass className="h-16 w-16 text-[#D95D39] sm:h-20 sm:w-20" strokeWidth={1.5} />
        </div>

        {/* Heading — Fraunces display */}
        <h1
          className="mb-3 text-center text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('heading')}
        </h1>

        {/* Description */}
        <p className="mb-10 max-w-md text-center text-base text-muted-foreground">
          {t('description')}
        </p>

        {/* Suggested pages as cards */}
        <div className="mb-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestedPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-[#D95D39]/30 hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4.5 w-4.5 text-muted-foreground transition-colors group-hover:text-[#D95D39]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t(page.titleKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(page.descKey)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('goBack')}
        </button>

        {/* Footer */}
        <p className="mt-12 text-xs text-muted-foreground/60">{t('footer')}</p>
      </div>
    </PageContainer>
  );
}
