'use client';

import { useTranslations } from 'next-intl';
import type { ActivityDigestEntry } from '@/features/dashboard/types';

interface ActivityDigestSectionProps {
  entries: ActivityDigestEntry[];
}

function getFreshnessClass(iso: string): string | null {
  const ageMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;
  if (ageMs < 5 * 60 * 1000) return 'live';
  if (ageMs < 60 * 60 * 1000) return 'recent';
  return null;
}

function formatRelative(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return '';
  const minutes = Math.floor(ageMs / (60 * 1000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatLine(entry: ActivityDigestEntry, dashboardActivityT: ReturnType<typeof useTranslations>): string {
  const actor = entry.actorName ?? `Member #${entry.actorOrganicId ?? '—'}`;
  const titleFromMeta =
    typeof entry.metadata?.title === 'string'
      ? (entry.metadata.title as string)
      : entry.subjectId.slice(0, 8);

  try {
    return dashboardActivityT(entry.eventType, { actor, title: titleFromMeta });
  } catch {
    return `${actor} · ${entry.eventType}`;
  }
}

export function ActivityDigestSection({ entries }: ActivityDigestSectionProps) {
  const t = useTranslations('Dashboard.activityDigest');
  const activityT = useTranslations('dashboard.activity');

  return (
    <section
      data-testid="dashboard-activity-digest"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h2 className="font-display text-xl text-foreground">{t('title')}</h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ol className="mt-5 space-y-2.5">
          {entries.map((entry) => {
            const freshness = getFreshnessClass(entry.createdAt);
            return (
              <li
                key={entry.id}
                className="flex items-start gap-3 border-l-2 border-border pl-4"
              >
                <FreshnessDot freshness={freshness} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90">{formatLine(entry, activityT)}</p>
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                  {formatRelative(entry.createdAt)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function FreshnessDot({ freshness }: { freshness: string | null }) {
  if (freshness === 'live') {
    return (
      <span className="relative mt-1.5 flex h-2 w-2 flex-none">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    );
  }
  if (freshness === 'recent') {
    return <span className="mt-1.5 inline-block h-2 w-2 flex-none rounded-full bg-amber-500" />;
  }
  return <span className="mt-1.5 inline-block h-2 w-2 flex-none rounded-full bg-muted-foreground/30" />;
}
