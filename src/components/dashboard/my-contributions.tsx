'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, CheckCircle2, Coins, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MyContributions } from '@/features/dashboard/types';

interface MyContributionsCardProps {
  contributions: MyContributions;
}

export function MyContributionsCard({ contributions }: MyContributionsCardProps) {
  const t = useTranslations('Dashboard.myContributions');
  const isEmpty =
    contributions.tasksDone === 0 &&
    contributions.pointsEarned === 0 &&
    contributions.xpEarned === 0;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">{t('title')}</h2>

      {isEmpty ? (
        <p className="mt-4 flex-1 text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="mt-5 space-y-2">
          <Stat
            icon={CheckCircle2}
            text={t('tasks', { count: contributions.tasksDone })}
          />
          <Stat icon={Coins} text={t('points', { count: contributions.pointsEarned })} />
          <Stat icon={Sparkles} text={t('xp', { count: contributions.xpEarned })} />
        </ul>
      )}

      {contributions.nextTaskHref && (
        <Link
          href={contributions.nextTaskHref}
          className="mt-auto inline-flex w-fit items-center gap-2 pt-6 text-sm font-medium text-organic-terracotta hover:text-organic-terracotta-hover"
        >
          {t('nextAction')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </article>
  );
}

function Stat({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5">
      <Icon className="h-4 w-4 text-organic-terracotta" aria-hidden />
      <span className="font-medium text-foreground">{text}</span>
    </li>
  );
}
