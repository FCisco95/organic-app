'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useMembers } from '@/features/members';
import { useLeaderboard } from '@/features/reputation';
import { MemberFilters, type SortOption } from '@/components/members/member-filters';
import { MemberGrid } from '@/components/members/member-grid';
import type { UserRole } from '@/types/database';

export function DirectoryTab() {
  const t = useTranslations('Members');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('xp');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMembers({ search, role, page, limit: 18 });
  const { data: leaderboard = [] } = useLeaderboard();

  const rankMap = useMemo(() => {
    const map = new Map<string, { rank: number; xpTotal: number }>();
    for (const entry of leaderboard) {
      if (entry.rank <= 100) {
        map.set(entry.id, { rank: entry.rank, xpTotal: entry.xp_total });
      }
    }
    return map;
  }, [leaderboard]);

  // Use server-provided global role counts (not page-scoped)
  const roleCounts = useMemo(() => {
    const serverCounts = (data as any)?.role_counts;
    if (serverCounts) return serverCounts as Partial<Record<UserRole | 'all', number>>;
    return { all: data?.total ?? 0 } as Partial<Record<UserRole | 'all', number>>;
  }, [data]);

  // Sort members client-side
  const sortedMembers = useMemo(() => {
    const members = [...(data?.members ?? [])];
    switch (sort) {
      case 'xp': {
        return members.sort((a, b) => {
          const aXp = rankMap.get(a.id)?.xpTotal ?? 0;
          const bXp = rankMap.get(b.id)?.xpTotal ?? 0;
          return bXp - aXp;
        });
      }
      case 'tasks':
        return members.sort((a, b) => b.tasks_completed - a.tasks_completed);
      case 'joined':
        return members.sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        });
      default:
        return members;
    }
  }, [data?.members, sort, rankMap]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleChange = (value: UserRole | 'all') => {
    setRole(value);
    setPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    setPage(1);
  };

  return (
    <div data-testid="directory-tab">
      {/* Header */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">{t('description')}</p>
        {data && (
          <p className="text-sm text-gray-400 mt-1">{t('totalMembers', { count: data.total })}</p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <MemberFilters
          search={search}
          onSearchChange={handleSearchChange}
          role={role}
          onRoleChange={handleRoleChange}
          roleCounts={roleCounts}
          sort={sort}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Grid */}
      <MemberGrid
        members={sortedMembers}
        loading={isLoading}
        total={data?.total ?? 0}
        page={page}
        limit={18}
        onPageChange={setPage}
        rankMap={rankMap}
      />
    </div>
  );
}
