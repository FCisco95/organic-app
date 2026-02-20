'use client';

import { useTranslations } from 'next-intl';
import type { Sprint, TaskSubmissionSummary } from '@/features/tasks';

type ContributorOption = NonNullable<TaskSubmissionSummary['user']>;

type TaskFiltersBarProps = {
  dataTestIdPrefix?: string;
  searchFilter: string;
  onSearchChange: (value: string) => void;
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
};

export function TaskFiltersBar({
  dataTestIdPrefix = 'tasks-filter',
  searchFilter,
  onSearchChange,
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
}: TaskFiltersBarProps) {
  const t = useTranslations('Tasks');

  return (
    <div
      className="mb-6 rounded-2xl border border-gray-200 bg-white/85 p-4"
      data-testid="tasks-filters-bar"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            {t('filterHierarchyLabel')}
          </p>
          <p className="text-sm text-gray-700">{t('filterHierarchyHint')}</p>
        </div>
        <span className="text-xs font-medium text-gray-500">{t('filters')}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600 lg:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('search')}</span>
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid={`${dataTestIdPrefix}-search`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            placeholder={t('searchPlaceholder')}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('categoryFilter')}</span>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            data-testid={`${dataTestIdPrefix}-category`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">{t('allCategories')}</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('contributorFilter')}</span>
          <select
            value={contributorFilter}
            onChange={(e) => onContributorChange(e.target.value)}
            data-testid={`${dataTestIdPrefix}-contributor`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">{t('allContributors')}</option>
            {contributorOptions.map((contributor) => (
              <option key={contributor.id} value={contributor.id}>
                {getContributorLabel(contributor)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('sprintFilter')}</span>
          <select
            value={sprintFilter}
            onChange={(e) => onSprintChange(e.target.value)}
            data-testid={`${dataTestIdPrefix}-sprint`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">{t('allSprints')}</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('dateFrom')}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            data-testid={`${dataTestIdPrefix}-date-from`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('dateTo')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            data-testid={`${dataTestIdPrefix}-date-to`}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>
      </div>
    </div>
  );
}
