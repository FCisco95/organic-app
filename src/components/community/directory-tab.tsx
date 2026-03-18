'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useMembers } from '@/features/members';
import { useLeaderboard } from '@/features/reputation';
import { MemberFilters } from '@/components/members/member-filters';
import { MemberGrid } from '@/components/members/member-grid';
import type { UserRole } from '@/types/database';

export function DirectoryTab() {
  const t = useTranslations('Members');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleChange = (value: UserRole | 'all') => {
    setRole(value);
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
        />
      </div>

      {/* Grid */}
      <MemberGrid
        members={data?.members ?? []}
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
