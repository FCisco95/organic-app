'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useSuggestedN,
  useTopCandidates,
  useStewardReviews,
  useRefreshSteward,
  usePromoteBacklog,
} from '@/features/backlog/hooks';

interface StewardPromotePanelProps {
  sprintId: string;
  orgId: string | null;
}

function stars(value: 1 | 2 | 3 | 4 | 5): string {
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

const RECOMMENDATION_STYLES: Record<'promote' | 'flag' | 'reject', string> = {
  promote: 'text-emerald-600',
  flag: 'text-amber-600',
  reject: 'text-rose-600',
};

export function StewardPromotePanel({ sprintId, orgId }: StewardPromotePanelProps) {
  const suggested = useSuggestedN(orgId);
  const [n, setN] = useState<number>(3);
  const [appliedSuggestion, setAppliedSuggestion] = useState(false);

  useEffect(() => {
    if (!appliedSuggestion && suggested.data) {
      setN(suggested.data);
      setAppliedSuggestion(true);
    }
  }, [suggested.data, appliedSuggestion]);

  const candidates = useTopCandidates(orgId, n);
  const taskIds = (candidates.data ?? []).map((c) => c.id);
  const reviews = useStewardReviews(taskIds);
  const refresh = useRefreshSteward();
  const promote = usePromoteBacklog(sprintId);

  function onRefresh() {
    if (taskIds.length === 0) return;
    refresh.mutate(
      { taskIds, force: true },
      {
        onSuccess: () => {
          void reviews.refetch();
          toast.success('Steward reviews refreshed');
        },
        onError: (e) => toast.error(`Refresh failed: ${(e as Error).message}`),
      },
    );
  }

  function onPromote() {
    promote.mutate(n, {
      onSuccess: (result) => {
        void candidates.refetch();
        toast.success(`Promoted ${result.n_actually_promoted} task(s) to the sprint`);
      },
      onError: (e) => toast.error(`Promotion failed: ${(e as Error).message}`),
    });
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      data-testid="steward-promote-panel"
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Steward suggestion</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Promote the top backlog items by net votes into this sprint.
            {suggested.data ? ` Suggested N: ${suggested.data}.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="steward-n-input">
            N
          </label>
          <input
            id="steward-n-input"
            type="number"
            min={1}
            max={50}
            value={n}
            onChange={(e) =>
              setN(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
            }
            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refresh.isPending || taskIds.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refresh.isPending ? 'animate-spin' : ''}`} />
            {refresh.isPending ? 'Refreshing' : 'Regenerate review'}
          </button>
          <button
            type="button"
            onClick={onPromote}
            disabled={promote.isPending || taskIds.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-cta bg-cta px-2.5 py-1 text-xs font-medium text-cta-fg hover:bg-cta-hover disabled:opacity-50"
          >
            <ArrowRight className="h-3 w-3" />
            {promote.isPending ? 'Promoting' : `Promote top ${n}`}
          </button>
        </div>
      </header>

      {candidates.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (candidates.data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No backlog candidates available. Members can vote on backlog tasks from /tasks?tab=backlog.
        </div>
      ) : (
        <ul className="space-y-2" data-testid="steward-candidate-list">
          {(candidates.data ?? []).map((c) => {
            const rv = reviews.data?.[c.id];
            return (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-md border border-border bg-background p-2"
              >
                <div className="w-10 shrink-0 text-center">
                  <div className="font-mono text-sm tabular-nums">{c.score}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.upvotes}↑ / {c.downvotes}↓
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={`/tasks/${c.id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {c.title}
                  </a>
                  {rv ? (
                    <div
                      className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground"
                      title={rv.concerns.join(', ')}
                    >
                      <span>
                        clarity <span className="text-amber-500">{stars(rv.clarity_score)}</span>
                      </span>
                      <span>·</span>
                      <span>
                        scope <span className="text-amber-500">{stars(rv.scope_score)}</span>
                      </span>
                      <span>·</span>
                      <span className={`font-medium ${RECOMMENDATION_STYLES[rv.recommendation]}`}>
                        {rv.recommendation}
                      </span>
                      {rv.concerns.length > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            {rv.concerns.length} concern{rv.concerns.length === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      No Steward review yet — click "Regenerate review".
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-[10px] text-muted-foreground">
                  {c.points ?? 0} pts
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
