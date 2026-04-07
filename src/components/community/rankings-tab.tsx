'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  Medal,
  Award,
  Star,
  TrendingUp,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context';
import { LevelBadge } from '@/components/reputation/level-badge';
import { formatXp, useLeaderboard, type LeaderboardEntry } from '@/features/reputation';
import { cn } from '@/lib/utils';

type SortColumn = 'rank' | 'level' | 'tasks' | 'xp';
type SortDirection = 'asc' | 'desc';

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return (
        <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold font-mono tabular-nums">
          {rank}
        </span>
      );
  }
};

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 dark:from-yellow-500/10 dark:to-amber-500/10 dark:border-yellow-500/30';
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300 dark:from-gray-500/10 dark:to-slate-500/10 dark:border-gray-500/30';
    case 3:
      return 'bg-gradient-to-r from-amber-50 to-organic-terracotta-lightest border-amber-300 dark:from-amber-500/10 dark:to-organic-terracotta/10 dark:border-amber-500/30';
    default:
      return 'bg-card border-border';
  }
};

/* ── Skeleton components ── */

function SkeletonPodium() {
  return (
    <section className="mb-8" aria-hidden="true">
      <div className="flex items-end justify-center gap-3 sm:gap-4">
        {/* 2nd place skeleton */}
        <div className="flex flex-col items-center w-24 sm:w-32">
          <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="mt-1 h-3 w-12 bg-muted animate-pulse rounded" />
          <div className="mt-2 w-full h-16 bg-muted animate-pulse rounded-t-lg" />
        </div>
        {/* 1st place skeleton */}
        <div className="flex flex-col items-center w-28 sm:w-36">
          <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse" />
          <div className="mt-2 h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="mt-1 h-3 w-14 bg-muted animate-pulse rounded" />
          <div className="mt-2 w-full h-24 bg-muted animate-pulse rounded-t-lg" />
        </div>
        {/* 3rd place skeleton */}
        <div className="flex flex-col items-center w-24 sm:w-32">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="mt-2 h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="mt-1 h-3 w-12 bg-muted animate-pulse rounded" />
          <div className="mt-2 w-full h-12 bg-muted animate-pulse rounded-t-lg" />
        </div>
      </div>
    </section>
  );
}

function SkeletonTableRow({ index }: { index: number }) {
  return (
    <>
      {/* Mobile skeleton card */}
      <div className="sm:hidden px-4 py-3 border-l-2 border-l-transparent" aria-hidden="true">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-muted animate-pulse" style={{ animationDelay: `${index * 80}ms` }} />
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${index * 80}ms` }} />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" style={{ animationDelay: `${index * 80}ms` }} />
            <div className="mt-1 h-3 w-16 bg-muted animate-pulse rounded" style={{ animationDelay: `${index * 80}ms` }} />
          </div>
          <div className="text-right">
            <div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" style={{ animationDelay: `${index * 80}ms` }} />
            <div className="mt-1 h-3 w-8 bg-muted animate-pulse rounded ml-auto" style={{ animationDelay: `${index * 80}ms` }} />
          </div>
        </div>
      </div>
      {/* Desktop skeleton row */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center" aria-hidden="true">
        <div className="col-span-1">
          <div className="w-6 h-6 rounded bg-muted animate-pulse" style={{ animationDelay: `${index * 80}ms` }} />
        </div>
        <div className="col-span-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${index * 80}ms` }} />
          <div>
            <div className="h-4 w-28 bg-muted animate-pulse rounded" style={{ animationDelay: `${index * 80}ms` }} />
            <div className="mt-1 h-3 w-16 bg-muted animate-pulse rounded" style={{ animationDelay: `${index * 80}ms` }} />
          </div>
        </div>
        <div className="col-span-2 flex justify-center">
          <div className="h-5 w-12 bg-muted animate-pulse rounded-full" style={{ animationDelay: `${index * 80}ms` }} />
        </div>
        <div className="col-span-2 flex justify-center">
          <div className="h-6 w-16 bg-muted animate-pulse rounded-full" style={{ animationDelay: `${index * 80}ms` }} />
        </div>
        <div className="col-span-3 flex justify-end">
          <div>
            <div className="h-5 w-20 bg-muted animate-pulse rounded ml-auto" style={{ animationDelay: `${index * 80}ms` }} />
            <div className="mt-1 h-3 w-12 bg-muted animate-pulse rounded ml-auto" style={{ animationDelay: `${index * 80}ms` }} />
          </div>
        </div>
      </div>
    </>
  );
}

function SkeletonLoading() {
  return (
    <>
      <SkeletonPodium />
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Skeleton table header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 border-b border-border">
          <div className="col-span-1"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></div>
          <div className="col-span-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></div>
          <div className="col-span-2 flex justify-center"><div className="h-4 w-12 bg-muted animate-pulse rounded" /></div>
          <div className="col-span-2 flex justify-center"><div className="h-4 w-12 bg-muted animate-pulse rounded" /></div>
          <div className="col-span-3 flex justify-end"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTableRow key={i} index={i} />
          ))}
        </div>
      </div>
    </>
  );
}

function SortIndicator({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
}) {
  if (column !== activeColumn) {
    return (
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/30 ml-1 inline-block" />
    );
  }
  return direction === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 text-organic-terracotta ml-1 inline-block" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 text-organic-terracotta ml-1 inline-block" />
  );
}

export function RankingsTab() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('Leaderboard');
  const tC = useTranslations('Community');
  const { data: leaderboard = [], isLoading: loading } = useLeaderboard();
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLDivElement>(null);

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.name) return entry.name;
    if (entry.organic_id) return t('organicId', { id: entry.organic_id });
    return entry.email?.split('@')[0] ?? 'Member';
  };

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (column === sortColumn) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        // Default direction: rank asc, others desc (highest first)
        setSortDirection(column === 'rank' ? 'asc' : 'desc');
      }
    },
    [sortColumn]
  );

  const filteredLeaderboard = useMemo(() => {
    let result = leaderboard;

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (entry) =>
          (entry.name && entry.name.toLowerCase().includes(q)) ||
          (entry.email && entry.email.toLowerCase().includes(q)) ||
          (entry.organic_id && String(entry.organic_id).includes(q))
      );
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'rank':
          cmp = a.rank - b.rank;
          break;
        case 'level':
          cmp = (a.level ?? 0) - (b.level ?? 0);
          break;
        case 'tasks':
          cmp = a.tasks_completed - b.tasks_completed;
          break;
        case 'xp':
          cmp = a.xp_total - b.xp_total;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [leaderboard, search, sortColumn, sortDirection]);

  const currentUserRank = leaderboard.find((entry) => entry.id === user?.id);

  // Only show podium when sorted by rank ascending and no search
  const showPodium =
    !search.trim() &&
    sortColumn === 'rank' &&
    sortDirection === 'asc' &&
    filteredLeaderboard.length >= 3;

  const podiumEntries = showPodium ? filteredLeaderboard.slice(0, 3) : [];
  const tableEntries = showPodium
    ? filteredLeaderboard.slice(3)
    : filteredLeaderboard;

  // Reset focused index when search or sort changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [search, sortColumn, sortDirection]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (tableEntries.length === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < tableEntries.length - 1 ? prev + 1 : prev;
            return next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : 0;
            return next;
          });
          break;
        }
        case 'Enter': {
          if (focusedIndex >= 0 && focusedIndex < tableEntries.length) {
            e.preventDefault();
            const entry = tableEntries[focusedIndex];
            router.push(`/community/${entry.id}`);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setFocusedIndex(-1);
          break;
        }
      }
    },
    [tableEntries, focusedIndex, router]
  );

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex < 0 || !tableRef.current) return;
    const rows = tableRef.current.querySelectorAll('[data-row-index]');
    const row = rows[focusedIndex];
    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  const sortableHeaderClass =
    'cursor-pointer select-none hover:bg-muted/80 transition-colors rounded px-1 -mx-1 inline-flex items-center';

  return (
    <div>
      {/* Command Palette Search */}
      <div className="relative mb-8">
        <Search
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tC('searchRankings')}
          className="w-full pl-11 pr-16 py-3.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 focus:border-organic-terracotta transition-all duration-200"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/40 bg-muted px-2 py-1 rounded-md border border-border/50">
          {tC('searchShortcut')}
        </span>
      </div>

      {/* Podium */}
      {!loading && showPodium && (
        <section
          className="mb-8 opacity-0 animate-fade-up stagger-2"
          data-testid="leaderboard-podium"
        >
          <div className="flex items-end justify-center gap-3 sm:gap-4">
            {/* 2nd place */}
            <Link
              href={`/community/${podiumEntries[1].id}`}
              className="flex flex-col items-center w-24 sm:w-32 group"
            >
              <div className="relative">
                {podiumEntries[1].avatar_url ? (
                  <Image
                    src={podiumEntries[1].avatar_url}
                    alt={getDisplayName(podiumEntries[1])}
                    width={56}
                    height={56}
                    className="rounded-full object-cover border-2 border-gray-300"
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-2 border-gray-300">
                    <span className="text-white font-bold text-lg">
                      {getDisplayName(podiumEntries[1])[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <Medal className="absolute -bottom-1 -right-1 w-5 h-5 text-gray-400" />
              </div>
              <p className="mt-2 text-xs font-medium text-foreground truncate w-full text-center group-hover:text-organic-terracotta transition-colors" title={getDisplayName(podiumEntries[1])}>
                {getDisplayName(podiumEntries[1])}
              </p>
              <p className="text-xs font-mono tabular-nums text-muted-foreground">
                {formatXp(podiumEntries[1].xp_total)} XP
              </p>
              {podiumEntries[1].level != null && podiumEntries[1].level > 0 && (
                <div className="mt-0.5">
                  <LevelBadge level={podiumEntries[1].level} size="sm" />
                </div>
              )}
              {podiumEntries[1].organic_id && (
                <p className="text-[10px] text-muted-foreground">
                  {t('organicId', { id: podiumEntries[1].organic_id })}
                </p>
              )}
              <div className="mt-2 w-full h-16 bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-lg flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">2</span>
              </div>
            </Link>

            {/* 1st place */}
            <Link
              href={`/community/${podiumEntries[0].id}`}
              className="flex flex-col items-center w-28 sm:w-36 group"
            >
              <div className="relative">
                {podiumEntries[0].avatar_url ? (
                  <Image
                    src={podiumEntries[0].avatar_url}
                    alt={getDisplayName(podiumEntries[0])}
                    width={72}
                    height={72}
                    className="rounded-full object-cover border-3 border-yellow-400"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center border-3 border-yellow-400">
                    <span className="text-white font-bold text-2xl">
                      {getDisplayName(podiumEntries[0])[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <Trophy className="absolute -bottom-1 -right-1 w-6 h-6 text-yellow-500" />
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground truncate w-full text-center group-hover:text-organic-terracotta transition-colors" title={getDisplayName(podiumEntries[0])}>
                {getDisplayName(podiumEntries[0])}
              </p>
              <p className="text-xs font-mono tabular-nums text-organic-terracotta font-semibold">
                {formatXp(podiumEntries[0].xp_total)} XP
              </p>
              {podiumEntries[0].level != null && podiumEntries[0].level > 0 && (
                <div className="mt-0.5">
                  <LevelBadge level={podiumEntries[0].level} size="sm" />
                </div>
              )}
              {podiumEntries[0].organic_id && (
                <p className="text-[10px] text-muted-foreground">
                  {t('organicId', { id: podiumEntries[0].organic_id })}
                </p>
              )}
              <div className="mt-2 w-full rounded-t-lg shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                <div className="h-24 bg-gradient-to-t from-yellow-200 to-yellow-100 dark:from-yellow-600/30 dark:to-yellow-500/20 rounded-t-lg flex items-center justify-center animate-glow-pulse">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    1
                  </span>
                </div>
              </div>
            </Link>

            {/* 3rd place */}
            <Link
              href={`/community/${podiumEntries[2].id}`}
              className="flex flex-col items-center w-24 sm:w-32 group"
            >
              <div className="relative">
                {podiumEntries[2].avatar_url ? (
                  <Image
                    src={podiumEntries[2].avatar_url}
                    alt={getDisplayName(podiumEntries[2])}
                    width={48}
                    height={48}
                    className="rounded-full object-cover border-2 border-amber-400"
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-organic-terracotta flex items-center justify-center border-2 border-amber-400">
                    <span className="text-white font-bold">
                      {getDisplayName(podiumEntries[2])[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <Award className="absolute -bottom-1 -right-1 w-5 h-5 text-amber-600" />
              </div>
              <p className="mt-2 text-xs font-medium text-foreground truncate w-full text-center group-hover:text-organic-terracotta transition-colors" title={getDisplayName(podiumEntries[2])}>
                {getDisplayName(podiumEntries[2])}
              </p>
              <p className="text-xs font-mono tabular-nums text-muted-foreground">
                {formatXp(podiumEntries[2].xp_total)} XP
              </p>
              {podiumEntries[2].level != null && podiumEntries[2].level > 0 && (
                <div className="mt-0.5">
                  <LevelBadge level={podiumEntries[2].level} size="sm" />
                </div>
              )}
              {podiumEntries[2].organic_id && (
                <p className="text-[10px] text-muted-foreground">
                  {t('organicId', { id: podiumEntries[2].organic_id })}
                </p>
              )}
              <div className="mt-2 w-full h-12 bg-gradient-to-t from-amber-200 to-amber-100 dark:from-amber-600/20 dark:to-amber-500/10 rounded-t-lg flex items-center justify-center">
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  3
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Current User Stats */}
      {!search.trim() && currentUserRank && (
        <div className="bg-gradient-to-r from-organic-terracotta/10 to-organic-terracotta/10 border border-organic-terracotta/20 rounded-xl p-4 mb-6 opacity-0 animate-fade-up stagger-3 hover:scale-[1.01] transition-transform duration-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-organic-terracotta-lightest0 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('yourPosition')}</p>
                <p className="font-bold text-foreground">
                  {t('rankLabel', { rank: currentUserRank.rank })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('yourXp')}</p>
              <p className="font-bold text-organic-terracotta text-xl font-mono tabular-nums animate-count-up">
                {t('xpLabel', { xp: formatXp(currentUserRank.xp_total) })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('pointsSecondaryLabel', { points: currentUserRank.total_points })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div>
          {/* Search bar skeleton */}
          <SkeletonLoading />
        </div>
      )}

      {/* Leaderboard Table — keyboard-navigable */}
      <div
        ref={tableRef}
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden opacity-0 animate-fade-up stagger-4 outline-none"
        tabIndex={0}
        role="grid"
        aria-label={tC('tabRankings')}
        onKeyDown={handleKeyDown}
        onBlur={() => setFocusedIndex(-1)}
      >
        {/* Table Header — sortable */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
          <div className="col-span-1">
            <button
              type="button"
              onClick={() => handleSort('rank')}
              className={sortableHeaderClass}
            >
              {t('tableRank')}
              <SortIndicator
                column="rank"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </button>
          </div>
          <div className="col-span-4">{t('tableMember')}</div>
          <div className="col-span-2 text-center">
            <button
              type="button"
              onClick={() => handleSort('level')}
              className={sortableHeaderClass}
            >
              {t('tableLevel')}
              <SortIndicator
                column="level"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </button>
          </div>
          <div className="col-span-2 text-center">
            <button
              type="button"
              onClick={() => handleSort('tasks')}
              className={sortableHeaderClass}
            >
              {t('tableTasks')}
              <SortIndicator
                column="tasks"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </button>
          </div>
          <div className="col-span-3 text-right">
            <button
              type="button"
              onClick={() => handleSort('xp')}
              className={cn(sortableHeaderClass, 'float-right')}
            >
              {t('tableXp')}
              <SortIndicator
                column="xp"
                activeColumn={sortColumn}
                direction={sortDirection}
              />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground">{t('emptyDescription')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tableEntries.map((entry, idx) => {
              const isCurrentUser = entry.id === user?.id;
              const isFocused = idx === focusedIndex;
              return (
                <Link
                  key={entry.id}
                  href={`/community/${entry.id}`}
                  data-row-index={idx}
                  className={cn(
                    'block opacity-0 animate-fade-up-in outline-none transition-all duration-150 ease-out',
                    isFocused && 'ring-2 ring-organic-terracotta ring-offset-2 ring-offset-card z-10 relative'
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  tabIndex={-1}
                >
                  {/* Mobile card */}
                  <div
                    className={cn(
                      'sm:hidden px-4 py-3 transition-all duration-200 hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-organic-terracotta',
                      getRankStyle(entry.rank),
                      isCurrentUser && 'ring-2 ring-organic-terracotta ring-inset',
                      isFocused && 'bg-muted/50 border-l-organic-terracotta'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{getRankIcon(entry.rank)}</div>
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={getDisplayName(entry)}
                          width={36}
                          height={36}
                          className="shrink-0 rounded-full object-cover border-2 border-border"
                          unoptimized
                        />
                      ) : (
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-organic-terracotta to-organic-terracotta flex items-center justify-center border-2 border-border">
                          <span className="text-white font-bold text-sm">
                            {getDisplayName(entry)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate" title={getDisplayName(entry)}>
                            {getDisplayName(entry)}
                          </p>
                          {isCurrentUser && (
                            <span className="shrink-0 text-xs bg-organic-terracotta-lightest0 text-white px-2 py-0.5 rounded-full">
                              {t('youBadge')}
                            </span>
                          )}
                          {entry.level != null && entry.level > 0 && (
                            <LevelBadge level={entry.level} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.organic_id && (
                            <span className="text-xs text-muted-foreground">
                              {t('organicId', { id: entry.organic_id })}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t('tasksCompleted', { count: entry.tasks_completed })}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            'font-bold font-mono tabular-nums',
                            entry.rank <= 3 ? 'text-organic-terracotta' : 'text-foreground'
                          )}
                        >
                          {formatXp(entry.xp_total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('pointsSecondaryLabel', { points: entry.total_points })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop row */}
                  <div
                    className={cn(
                      'hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center transition-all duration-200 hover:scale-[1.005] hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-organic-terracotta',
                      getRankStyle(entry.rank),
                      isCurrentUser && 'ring-2 ring-organic-terracotta ring-inset',
                      isFocused && 'bg-muted/50 border-l-organic-terracotta'
                    )}
                  >
                    <div className="col-span-1 flex items-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    <div className="col-span-4 flex items-center gap-3">
                      {entry.avatar_url ? (
                        <Image
                          src={entry.avatar_url}
                          alt={getDisplayName(entry)}
                          width={40}
                          height={40}
                          className="rounded-full object-cover border-2 border-border"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-organic-terracotta to-organic-terracotta flex items-center justify-center border-2 border-border">
                          <span className="text-white font-bold">
                            {getDisplayName(entry)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {getDisplayName(entry)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-organic-terracotta-lightest0 text-white px-2 py-0.5 rounded-full">
                              {t('youBadge')}
                            </span>
                          )}
                        </p>
                        {entry.organic_id && (
                          <p className="text-sm text-muted-foreground">
                            {t('organicId', { id: entry.organic_id })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-2">
                      {entry.level != null && entry.level > 0 && (
                        <LevelBadge level={entry.level} size="sm" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatXp(entry.xp_total)}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-full text-sm">
                        {t('tasksCompleted', { count: entry.tasks_completed })}
                      </span>
                    </div>

                    <div className="col-span-3 text-right">
                      <p
                        className={cn(
                          'font-bold text-lg font-mono tabular-nums',
                          entry.rank <= 3 ? 'text-organic-terracotta' : 'text-foreground'
                        )}
                      >
                        {t('xpLabel', { xp: formatXp(entry.xp_total) })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('pointsSecondaryLabel', { points: entry.total_points })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-muted/50 border border-border rounded-lg p-4 opacity-0 animate-fade-up stagger-5">
        <h4 className="font-medium text-foreground mb-2">{t('howRankingTitle')}</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>{t('howRankingItem1')}</li>
          <li>{t('howRankingItem2')}</li>
          <li>{t('howRankingItem3')}</li>
          <li>{t('howRankingItem4')}</li>
        </ul>
      </div>

    </div>
  );
}
