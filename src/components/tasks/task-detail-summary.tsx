'use client';

import Image from 'next/image';
import { Calendar, Heart, Tag, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TASK_TYPE_LABELS, TaskSubmissionWithReviewer, TaskWithRelations } from '@/features/tasks';

type Contributor = NonNullable<TaskSubmissionWithReviewer['user']>;

type DisplayUser = {
  name?: string | null;
  email?: string | null;
  organic_id?: number | null;
  avatar_url?: string | null;
};

type TaskDetailSummaryProps = {
  task: TaskWithRelations;
  contributors: Contributor[];
  showAllContributors: boolean;
  likeCount: number;
  likedByUser: boolean;
  canLike: boolean;
  onToggleLike: () => void;
  onToggleContributors: () => void;
  onOpenContributorsModal: () => void;
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
  getDisplayName: (user: DisplayUser | null | undefined) => string;
  formatDate: (dateString: string) => string;
};

export function TaskDetailSummary({
  task,
  contributors,
  showAllContributors,
  likeCount,
  likedByUser,
  canLike,
  onToggleLike,
  onToggleContributors,
  onOpenContributorsModal,
  getStatusBadge,
  getPriorityBadge,
  getDisplayName,
  formatDate,
}: TaskDetailSummaryProps) {
  const t = useTranslations('TaskDetail');

  const getContributorName = (contributor: Contributor) => {
    if (contributor.organic_id) return t('organicId', { id: contributor.organic_id });
    return contributor.name ?? contributor.email;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <Heart className={`w-4 h-4 ${likedByUser ? 'fill-organic-orange' : ''}`} />
            {t('favoritesCount', { count: likeCount })}
          </span>
        </div>
        {task.description && (
          <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(task.status ?? 'backlog')}`}
        >
          {t(`status.${task.status ?? 'backlog'}`)}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(task.priority ?? 'medium')}`}
        >
          {t('priorityLabel', { priority: t(`priority.${task.priority ?? 'medium'}`) })}
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
          {t('pointsLabel', { points: task.points ?? 0 })}
        </span>
        <button
          type="button"
          onClick={onToggleLike}
          disabled={!canLike}
          aria-label={likedByUser ? t('likedTask') : t('likeTask')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${
            likedByUser
              ? 'border-organic-orange text-organic-orange bg-orange-50'
              : 'border-gray-200 text-gray-600 bg-white'
          } ${canLike ? 'hover:border-organic-orange hover:text-organic-orange' : 'cursor-default'}`}
        >
          <Heart className={`w-4 h-4 ${likedByUser ? 'fill-organic-orange' : ''}`} />
          {likeCount}
        </button>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
          {TASK_TYPE_LABELS[task.task_type ?? 'custom']}
        </span>
        {task.is_team_task && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
            <Users className="w-3 h-3" />
            {t('teamTask')}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
        <div>
          <span className="font-medium text-gray-700">{t('category')}</span>{' '}
          {task.labels && task.labels.length > 0 ? task.labels[0] : t('noCategory')}
        </div>
        <div>
          <span className="font-medium text-gray-700">{t('sprint')}</span>{' '}
          {task.sprint ? task.sprint.name : t('noSprint')}
        </div>
        <div>
          <span className="font-medium text-gray-700">{t('submissions')}</span>{' '}
          <button
            type="button"
            onClick={onOpenContributorsModal}
            className="text-organic-orange hover:text-orange-600"
          >
            {t('submissionsCount', { count: task.submissions?.length ?? 0 })}
          </button>
        </div>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {task.labels.map((label, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
            >
              <Tag className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{t('contributors')}</p>
          {contributors.length > 3 && (
            <button
              type="button"
              onClick={onToggleContributors}
              className="text-xs text-organic-orange hover:text-orange-600"
            >
              {showAllContributors ? t('showLess') : t('viewAll')}
            </button>
          )}
        </div>
        {contributors.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">{t('noContributors')}</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {(showAllContributors ? contributors : contributors.slice(0, 3)).map((contributor) => (
              <span
                key={contributor.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {getContributorName(contributor)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-gray-600 mb-1">{t('assignee')}</p>
          <div className="flex items-center gap-2">
            {task.assignee?.avatar_url ? (
              <Image
                src={task.assignee.avatar_url}
                alt={getDisplayName(task.assignee)}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <User className="w-6 h-6 text-gray-400" />
            )}
            <span className="font-medium">{getDisplayName(task.assignee)}</span>
          </div>
        </div>

        {task.sprint && (
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('sprint')}</p>
            <Link
              href={`/sprints/${task.sprint.id}`}
              className="font-medium text-organic-orange hover:text-orange-600"
            >
              {task.sprint.name}
            </Link>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 mb-1">{t('created')}</p>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{task.created_at ? formatDate(task.created_at) : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
