'use client';

import Image from 'next/image';
import { Heart, Tag, User, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { TaskSubmissionWithReviewer, TaskWithRelations } from '@/features/tasks';
import { estimateXpFromPoints } from '@/features/tasks/utils';

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
  const tTasks = useTranslations('Tasks');
  const participants = task.assignees ?? [];
  const estimatedTaskXp = estimateXpFromPoints(task.points ?? task.base_points ?? 0);

  const getContributorName = (contributor: Contributor) => {
    if (contributor.organic_id) return t('organicId', { id: contributor.organic_id });
    return contributor.name ?? contributor.email;
  };

  return (
    <div className="space-y-4" data-testid="task-detail-summary">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{task.title}</h1>
        {task.description && (
          <p className="text-gray-600 whitespace-pre-wrap max-w-prose">{task.description}</p>
        )}
      </div>

      {task.proposal && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {t('governanceSource')}
            </span>
            {task.proposal_version?.version_number ? (
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                {t('proposalVersionSource', { version: task.proposal_version.version_number })}
              </span>
            ) : null}
            <span className="text-xs text-amber-800">{t('provenanceLocked')}</span>
          </div>
          <Link
            href={`/proposals/${task.proposal.id}`}
            className="text-sm font-medium text-amber-900 underline decoration-amber-300 underline-offset-2 hover:text-amber-700"
          >
            {task.proposal.title}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span
          className={`px-3 py-1 rounded-full font-medium border ${getStatusBadge(task.status ?? 'backlog')}`}
        >
          {t(`status.${task.status ?? 'backlog'}`)}
        </span>
        <span className="text-muted-foreground">
          {t('priorityLabel', { priority: t(`priority.${task.priority ?? 'medium'}`) })}
        </span>

        <span className="text-muted-foreground/40">|</span>

        <span className="text-muted-foreground">
          {t('pointsLabel', { points: task.points ?? 0 })}
        </span>
        <span
          className="text-muted-foreground font-mono tabular-nums"
          data-testid="task-estimated-xp-chip"
        >
          {t('estimatedXpLabel', { xp: estimatedTaskXp })}
        </span>

        <span className="text-muted-foreground/40">|</span>

        <span className="px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
          {tTasks(`taskTypes.${task.task_type ?? 'custom'}`)}
        </span>
        {task.is_team_task && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
            <Users className="w-3 h-3" />
            {t('teamTask')}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleLike}
          disabled={!canLike}
          aria-label={likedByUser ? t('likedTask') : t('likeTask')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
            likedByUser
              ? 'border-organic-orange text-organic-orange bg-orange-50'
              : 'border-gray-200 text-gray-600 bg-white'
          } ${canLike ? 'hover:border-organic-orange hover:text-organic-orange' : 'cursor-default'}`}
        >
          <Heart className={`w-3.5 h-3.5 ${likedByUser ? 'fill-organic-orange' : ''}`} />
          {likeCount}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">{t('category')}</dt>
          <dd className="font-medium text-gray-900">
            {task.labels && task.labels.length > 0 ? task.labels[0] : t('noCategory')}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('sprint')}</dt>
          <dd className="font-medium text-gray-900">
            {task.sprint ? task.sprint.name : t('noSprint')}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('submissions')}</dt>
          <dd>
            <button
              type="button"
              onClick={onOpenContributorsModal}
              className="font-medium text-organic-orange hover:text-orange-600"
            >
              {t('submissionsCount', { count: task.submissions?.length ?? 0 })}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('created')}</dt>
          <dd className="font-mono tabular-nums text-xs text-gray-900">
            {task.created_at ? formatDate(task.created_at) : '-'}
          </dd>
        </div>
      </dl>

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
          <p className="text-sm font-medium text-gray-700">{t('participants')}</p>
          {participants.length > 0 && (
            <span className="text-xs text-gray-500">{tTasks('participantCount', { count: participants.length })}</span>
          )}
        </div>
        {participants.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">{t('noParticipants')}</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {participants.map((assignment) => {
              if (!assignment.user) return null;

              return (
                <span
                  key={assignment.id}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {assignment.user.avatar_url ? (
                    <Image
                      src={assignment.user.avatar_url}
                      alt={getDisplayName(assignment.user)}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  {getDisplayName(assignment.user)}
                </span>
              );
            })}
          </div>
        )}
      </div>

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

    </div>
  );
}
