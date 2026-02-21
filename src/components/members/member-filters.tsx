'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { UserRole } from '@/types/database';

interface MemberFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: UserRole | 'all';
  onRoleChange: (value: UserRole | 'all') => void;
}

const ROLE_OPTIONS: { value: UserRole | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'filters.all' },
  { value: 'admin', labelKey: 'filters.admin' },
  { value: 'council', labelKey: 'filters.council' },
  { value: 'member', labelKey: 'filters.member' },
  { value: 'guest', labelKey: 'filters.guest' },
];

export function MemberFilters({ search, onSearchChange, role, onRoleChange }: MemberFiltersProps) {
  const t = useTranslations('Members');

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          data-testid="members-filter-search"
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
        />
      </div>

      {/* Role filter chips */}
      <div className="flex gap-1.5 flex-wrap" data-testid="members-filter-role">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRoleChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              role === opt.value
                ? 'bg-organic-orange text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
