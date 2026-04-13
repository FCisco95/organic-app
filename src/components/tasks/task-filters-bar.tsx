'use client';

import { useRef, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getLabelDisplay, type Sprint, type TaskSubmissionSummary } from '@/features/tasks';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Count active advanced filters (excluding search and sort)
  const activeFilterCount = [
    categoryFilter !== 'all',
    contributorFilter !== 'all',
    sprintFilter !== 'all',
    Boolean(dateFrom),
    Boolean(dateTo),
  ].filter(Boolean).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const inputClassName =
    'h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30';

  // Build active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (categoryFilter !== 'all') {
    activeChips.push({
      label: getLabelDisplay(categoryFilter, t),
      onRemove: () => onCategoryChange('all'),
    });
  }
  if (contributorFilter !== 'all') {
    const contributor = contributorOptions.find((c) => c.id === contributorFilter);
    activeChips.push({
      label: contributor ? getContributorLabel(contributor) : contributorFilter,
      onRemove: () => onContributorChange('all'),
    });
  }
  if (sprintFilter !== 'all') {
    const sprint = sprints.find((s) => s.id === sprintFilter);
    activeChips.push({
      label: sprint?.name ?? sprintFilter,
      onRemove: () => onSprintChange('all'),
    });
  }
  if (dateFrom) {
    activeChips.push({
      label: `${t('dateFrom')}: ${dateFrom}`,
      onRemove: () => onDateFromChange(''),
    });
  }
  if (dateTo) {
    activeChips.push({
      label: `${t('dateTo')}: ${dateTo}`,
      onRemove: () => onDateToChange(''),
    });
  }

  return (
    <section
      className="space-y-2"
      data-testid="tasks-filters-bar"
    >
      {/* Single compact row: search + sort + filters button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
        </div>

        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as TaskSortOption)}
          data-testid={`${dataTestIdPrefix}-sort`}
          className={`${inputClassName} w-32 shrink-0 sm:w-40`}
        >
          <option value="newest">{t('sort.newest')}</option>
          <option value="oldest">{t('sort.oldest')}</option>
          <option value="dueSoon">{t('sort.dueSoon')}</option>
          <option value="pointsHigh">{t('sort.pointsHigh')}</option>
          <option value="mostLiked">{t('sort.mostLiked')}</option>
        </select>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              showDropdown || activeFilterCount > 0
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-input text-foreground hover:bg-muted'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('filtersButton')}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {showDropdown && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-[320px] rounded-lg border border-border bg-card p-3 shadow-lg sm:w-[480px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
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
                        {getLabelDisplay(category, t)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
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
                  <span className="text-xs font-medium text-muted-foreground">
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

                <div className="flex gap-2">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
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
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
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
              </div>

              {hasActiveFilters && (
                <div className="mt-3 flex justify-end border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t('clearFilters')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
