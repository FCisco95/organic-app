'use client';

import { useTranslations } from 'next-intl';
import type { Sprint, TaskSubmissionSummary } from '@/features/tasks';

type ContributorOption = NonNullable<TaskSubmissionSummary['user']>;

type TaskFiltersBarProps = {
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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium text-gray-700">{t('filters')}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('search')}
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            placeholder={t('searchPlaceholder')}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('categoryFilter')}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
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
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('contributorFilter')}
          <select
            value={contributorFilter}
            onChange={(e) => onContributorChange(e.target.value)}
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
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('sprintFilter')}
          <select
            value={sprintFilter}
            onChange={(e) => onSprintChange(e.target.value)}
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
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('dateFrom')}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('dateTo')}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>
      </div>
    </div>
  );
}
