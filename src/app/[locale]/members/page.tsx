'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useMembers } from '@/features/members';
import { MemberFilters } from '@/components/members/member-filters';
import { MemberGrid } from '@/components/members/member-grid';
import type { UserRole } from '@/types/database';

export default function MembersPage() {
  const t = useTranslations('Members');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMembers({ search, role, page, limit: 18 });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleChange = (value: UserRole | 'all') => {
    setRole(value);
    setPage(1);
  };

  return (
    <PageContainer width="wide">
      <div data-testid="members-page">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Users className="w-6 h-6 text-organic-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
        </div>
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
      />
      </div>
    </PageContainer>
  );
}
