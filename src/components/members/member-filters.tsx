'use client';

import { Search, X, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { UserRole } from '@/types/database';
import { cn } from '@/lib/utils';

export type SortOption = 'xp' | 'tasks' | 'joined';

interface MemberFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: UserRole | 'all';
  onRoleChange: (value: UserRole | 'all') => void;
  roleCounts?: Partial<Record<UserRole | 'all', number>>;
  sort?: SortOption;
  onSortChange?: (value: SortOption) => void;
}

const ROLE_OPTIONS: { value: UserRole | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'filters.all' },
  { value: 'admin', labelKey: 'filters.admin' },
  { value: 'council', labelKey: 'filters.council' },
  { value: 'member', labelKey: 'filters.member' },
  { value: 'guest', labelKey: 'filters.guest' },
];

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'xp', labelKey: 'sort.byXp' },
  { value: 'tasks', labelKey: 'sort.byTasks' },
  { value: 'joined', labelKey: 'sort.byJoinDate' },
];

export function MemberFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  roleCounts,
  sort = 'xp',
  onSortChange,
}: MemberFiltersProps) {
  const t = useTranslations('Members');

  const hasActiveFilter = role !== 'all' || search.trim().length > 0;

  const handleClearFilters = () => {
    onSearchChange('');
    onRoleChange('all');
  };

  return (
    <div className="space-y-3">
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
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 focus:border-organic-terracotta"
          />
        </div>

        {/* Sort dropdown */}
        {onSortChange && (
          <div className="relative">
            <ArrowUpDown aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none pl-10 pr-8 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30 focus:border-organic-terracotta cursor-pointer"
              aria-label={t('sort.label')}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Role filter chips + clear button */}
      <div className="flex items-center gap-1.5 flex-wrap" data-testid="members-filter-role">
        {ROLE_OPTIONS.map((opt) => {
          const count = roleCounts?.[opt.value];
          return (
            <button
              key={opt.value}
              onClick={() => onRoleChange(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ease-out',
                role === opt.value
                  ? 'bg-cta text-cta-fg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {t(opt.labelKey)}
              {count != null && (
                <span className={cn(
                  'ml-1.5 text-xs font-mono tabular-nums',
                  role === opt.value ? 'text-white/80' : 'text-gray-400'
                )}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}

        {hasActiveFilter && (
          <button
            onClick={handleClearFilters}
            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors duration-150 ease-out"
          >
            <X className="w-3 h-3" />
            {t('filters.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
