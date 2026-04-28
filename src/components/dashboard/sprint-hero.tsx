'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Clock, Users } from 'lucide-react';
import type { SprintHero } from '@/features/dashboard/types';
import { SprintAiSummaryCard } from './sprint-ai-summary';
import { SprintCountdown } from './sprint-countdown';

interface SprintHeroSectionProps {
  sprint: SprintHero | null;
}

function formatPhaseLabel(status: string | null): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

function getCountdownTarget(sprint: SprintHero): string {
  if (sprint.status === 'dispute_window' && sprint.disputeWindowEndsAt) {
    return sprint.disputeWindowEndsAt;
  }
  return sprint.endAt;
}

export function SprintHeroSection({ sprint }: SprintHeroSectionProps) {
  const t = useTranslations('Dashboard.sprintHero');

  if (!sprint) {
    return (
      <section
        data-testid="dashboard-sprint-hero"
        className="rounded-2xl border border-border bg-card p-8"
      >
        <p className="text-sm text-muted-foreground">No active sprint right now.</p>
      </section>
    );
  }

  const progressPercent =
    sprint.progress.total === 0
      ? 0
      : Math.round((sprint.progress.done / sprint.progress.total) * 100);

  return (
    <section
      data-testid="dashboard-sprint-hero"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative bg-gradient-to-br from-organic-terracotta/15 via-organic-terracotta/5 to-transparent p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-organic-terracotta">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-organic-terracotta" />
              {formatPhaseLabel(sprint.status)}
            </div>
            <h2 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
              {sprint.name}
            </h2>
            {sprint.goal && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{sprint.goal}</p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-organic-terracotta" aria-hidden />
              <span>
                {t('endsIn', { countdown: '' })}
              </span>
              <SprintCountdown
                targetIso={getCountdownTarget(sprint)}
                className="font-mono tabular-nums text-foreground"
              />
            </div>
          </div>
          <Link
            href={`/sprints/${sprint.id}`}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-organic-terracotta/40 hover:text-organic-terracotta"
          >
            {t('viewSprint')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 border-t border-border p-6 sm:p-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SprintAiSummaryCard summary={sprint.aiSummary ?? { text: '', themes: [], generatedAt: null, model: null }} />

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('tasksProgress', { done: sprint.progress.done, total: sprint.progress.total })}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {progressPercent}%
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-organic-terracotta transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {t('topContributors')}
          </p>
          {sprint.topContributors.length === 0 ? (
            <p className="text-xs text-muted-foreground/70">No contributors yet.</p>
          ) : (
            <ul className="space-y-2">
              {sprint.topContributors.map((c) => (
                <li
                  key={c.userId}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ContributorAvatar
                      avatarUrl={c.avatarUrl}
                      name={c.name}
                      organicId={c.organicId}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.name ?? `Member #${c.organicId ?? '—'}`}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-organic-terracotta">
                    {c.xpEarned}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ContributorAvatar({
  avatarUrl,
  name,
  organicId,
}: {
  avatarUrl: string | null;
  name: string | null;
  organicId: number | null;
}) {
  const initial = (name?.trim()?.[0] ?? `${organicId ?? '?'}`).toString().toUpperCase();
  if (avatarUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
      </>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-organic-terracotta/10 text-xs font-semibold text-organic-terracotta">
      {initial}
    </span>
  );
}
