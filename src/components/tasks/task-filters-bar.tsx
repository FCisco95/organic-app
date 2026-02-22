'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Sprint, TaskSubmissionSummary } from '@/features/tasks';

type ContributorOption = NonNullable<TaskSubmissionSummary['user']>;
type TaskSortOption = 'newest' | 'oldest' | 'dueSoon' | 'pointsHigh' | 'mostLiked';

type TaskFiltersBarProps = {
  dataTestIdPrefix?: string;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  sortBy: TaskSortOption;
  onSortChange: (value: TaskSortOption) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categoryOptions: string[];
  contributorFilter: string;
  onContributorChange: (value: string) => void;
  contributorOptions: ContributorOption[];
  sprintFilter: string;
  onSprintChange: (value: string) => void;
  sprints: Sprint[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  getContributorLabel: (user: ContributorOption) => string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function TaskFiltersBar({
  dataTestIdPrefix = 'tasks-filter',
  searchFilter,
  onSearchChange,
  sortBy,
  onSortChange,
  categoryFilter,
  onCategoryChange,
  categoryOptions,
  contributorFilter,
  onContributorChange,
  contributorOptions,
  sprintFilter,
  onSprintChange,
  sprints,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  getContributorLabel,
  hasActiveFilters,
  onClearFilters,
}: TaskFiltersBarProps) {
  const t = useTranslations('Tasks');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowAdvancedFilters(true);
    }
  }, [hasActiveFilters]);

  const inputClassName =
    'h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="tasks-filters-bar"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('search')}
          </span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchFilter}
              onChange={(event) => onSearchChange(event.target.value)}
              data-testid={`${dataTestIdPrefix}-search`}
              className={`${inputClassName} w-full pl-9`}
              placeholder={t('searchPlaceholder')}
            />
          </span>
        </label>

        <label className="w-full lg:w-56">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('sortBy')}
          </span>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as TaskSortOption)}
            data-testid={`${dataTestIdPrefix}-sort`}
            className={`${inputClassName} w-full`}
          >
            <option value="newest">{t('sort.newest')}</option>
            <option value="oldest">{t('sort.oldest')}</option>
            <option value="dueSoon">{t('sort.dueSoon')}</option>
            <option value="pointsHigh">{t('sort.pointsHigh')}</option>
            <option value="mostLiked">{t('sort.mostLiked')}</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((previous) => !previous)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showAdvancedFilters ? t('hideAdvancedFilters') : t('showAdvancedFilters')}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-10 items-center rounded-lg border border-input px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>
      {showAdvancedFilters && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('categoryFilter')}
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryChange(event.target.value)}
              data-testid={`${dataTestIdPrefix}-category`}
              className={inputClassName}
            >
              <option value="all">{t('allCategories')}</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('contributorFilter')}
            </span>
            <select
              value={contributorFilter}
              onChange={(event) => onContributorChange(event.target.value)}
              data-testid={`${dataTestIdPrefix}-contributor`}
              className={inputClassName}
            >
              <option value="all">{t('allContributors')}</option>
              {contributorOptions.map((contributor) => (
                <option key={contributor.id} value={contributor.id}>
                  {getContributorLabel(contributor)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('sprintFilter')}
            </span>
            <select
              value={sprintFilter}
              onChange={(event) => onSprintChange(event.target.value)}
              data-testid={`${dataTestIdPrefix}-sprint`}
              className={inputClassName}
            >
              <option value="all">{t('allSprints')}</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('dateFrom')}
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              data-testid={`${dataTestIdPrefix}-date-from`}
              className={inputClassName}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('dateTo')}
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
              data-testid={`${dataTestIdPrefix}-date-to`}
              className={inputClassName}
            />
          </label>
        </div>
      )}
    </section>
  );
}
