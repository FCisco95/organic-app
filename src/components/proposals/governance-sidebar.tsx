'use client';

import { Link } from '@/i18n/navigation';
import {
  TrendingUp,
  Vote,
  MessageSquare,
  Flame,
  Users,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProposalListItem } from '@/features/proposals/types';
import { PROPOSAL_CATEGORY_BORDER_COLORS, type ProposalCategory } from '@/features/proposals/types';
import type { User } from '@supabase/supabase-js';

interface StageCounts {
  public: number;
  qualified: number;
  discussion: number;
  voting: number;
  finalized: number;
  canceled: number;
}

interface GovernanceSidebarProps {
  proposals: ProposalListItem[];
  stageCounts: StageCounts;
  totalComments: number;
  activeStatus: string;
  onStatusFilter: (status: string) => void;
  user: User | null;
}

const QUICK_FILTERS = [
  { key: 'all', labelKey: 'filterAll' as const },
  { key: 'discussion', labelKey: 'statusDiscussion' as const },
  { key: 'voting', labelKey: 'statusVoting' as const },
  { key: 'finalized', labelKey: 'statusFinalized' as const },
] as const;

export function GovernanceSidebar({
  proposals,
  stageCounts,
  totalComments,
  activeStatus,
  onStatusFilter,
  user,
}: GovernanceSidebarProps) {
  const t = useTranslations('Proposals');

  const openCount =
    (stageCounts.public ?? 0) +
    (stageCounts.qualified ?? 0) +
    (stageCounts.discussion ?? 0) +
    (stageCounts.voting ?? 0);

  const hotTopics = [...proposals]
    .filter((p) => p.status !== 'voting')
    .sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0))
    .slice(0, 3);

  return (
    <aside className="space-y-4">
      {/* Governance Pulse */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-bold text-slate-800">Governance Pulse</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KpiTile value={openCount} label={t('metricOpenLifecycle')} accent="text-slate-900" />
          <KpiTile
            value={stageCounts.voting}
            label={t('metricVotingNow')}
            accent="text-orange-600"
            highlight={stageCounts.voting > 0}
          />
          <KpiTile value={stageCounts.discussion} label={t('statusDiscussion')} accent="text-amber-700" />
          <KpiTile value={totalComments} label={t('metricDiscussionVolume')} accent="text-slate-700" />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Vote className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-800">Browse by stage</h2>
        </div>
        <div className="space-y-1">
          {QUICK_FILTERS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => onStatusFilter(key)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeStatus === key
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>{t(labelKey)}</span>
              {activeStatus === key && (
                <ChevronRight className="h-3.5 w-3.5 text-orange-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hot Topics */}
      {hotTopics.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-800">Hot Topics</h2>
          </div>
          <div className="space-y-3">
            {hotTopics.map((proposal) => {
              const category = (proposal.category ?? 'feature') as ProposalCategory;
              const borderColor = PROPOSAL_CATEGORY_BORDER_COLORS[category];
              return (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}`}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border-l-2 pl-2.5 py-1 hover:bg-slate-50 transition-colors group',
                    borderColor
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold text-slate-700 group-hover:text-orange-700 transition-colors">
                      {proposal.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MessageSquare className="h-3 w-3" />
                      <span>{proposal.comments_count ?? 0}</span>
                      <span>·</span>
                      <span>
                        {proposal.created_at
                          ? formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })
                          : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA for unauthenticated */}
      {!user && (
        <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-bold text-orange-800">{t('ctaTitle')}</h2>
          </div>
          <p className="mb-3 text-xs text-orange-700 leading-relaxed">{t('ctaDescription')}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-700"
          >
            {t('signIn')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </aside>
  );
}

function KpiTile({
  value,
  label,
  accent,
  highlight = false,
}: {
  value: number;
  label: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        highlight ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-slate-50'
      )}
    >
      <p className={cn('font-mono text-xl font-black tabular-nums', accent)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 leading-tight mt-0.5">
        {label}
      </p>
    </div>
  );
}
