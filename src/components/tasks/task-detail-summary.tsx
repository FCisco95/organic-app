'use client';

import Image from 'next/image';
import { Heart, Tag, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getLabelDisplay, TaskSubmissionWithReviewer, TaskWithRelations, type TaskStatus } from '@/features/tasks';
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

const STATUS_TEXT_COLOR: Record<TaskStatus, string> = {
  backlog: 'text-muted-foreground',
  todo: 'text-violet-600',
  in_progress: 'text-amber-600',
  review: 'text-purple-600',
  done: 'text-emerald-600',
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
  getDisplayName,
  formatDate,
}: TaskDetailSummaryProps) {
  const t = useTranslations('TaskDetail');
  const tTasks = useTranslations('Tasks');
  const participants = task.assignees ?? [];
  const estimatedTaskXp = estimateXpFromPoints(task.points ?? task.base_points ?? 0);
  const status = (task.status ?? 'backlog') as TaskStatus;
  const statusColor = STATUS_TEXT_COLOR[status] ?? STATUS_TEXT_COLOR.backlog;

  const getContributorName = (contributor: Contributor) => {
    if (contributor.organic_id) return t('organicId', { id: contributor.organic_id });
    return contributor.name ?? contributor.email;
  };

  // Avatar stack component
  const AvatarStack = ({ users, maxVisible = 4 }: { users: { id: string; avatar_url?: string | null; name?: string | null; email?: string | null; organic_id?: number | null }[]; maxVisible?: number }) => {
    const visible = users.slice(0, maxVisible);
    const overflow = users.length - maxVisible;

    return (
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visible.map((u) => (
            <div
              key={u.id}
              className="relative h-6 w-6 shrink-0 rounded-full ring-2 ring-card"
              title={getDisplayName(u)}
            >
              {u.avatar_url ? (
                <Image
                  src={u.avatar_url}
                  alt={getDisplayName(u)}
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
        {overflow > 0 && (
          <span className="ml-1.5 text-xs text-muted-foreground">+{overflow}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="task-detail-summary">
      {/* Title + inline status as colored text */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          <span className={`text-sm font-medium ${statusColor}`}>
            {t(`status.${status}`)}
          </span>
        </div>
        {task.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground max-w-prose">{task.description}</p>
        )}
      </div>

      {/* Proposal banner — compact */}
      {task.proposal && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
              {t('governanceSource')}
            </span>
            {task.proposal_version?.version_number ? (
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200">
                {t('proposalVersionSource', { version: task.proposal_version.version_number })}
              </span>
            ) : null}
            <span className="text-amber-800">{t('provenanceLocked')}</span>
          </div>
          <Link
            href={`/proposals/${task.proposal.id}`}
            className="mt-1 block text-sm font-medium text-amber-900 underline decoration-amber-300 underline-offset-2 hover:text-amber-700"
          >
            {task.proposal.title}
          </Link>
        </div>
      )}

      {/* Like button + priority inline */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {t('priorityLabel', { priority: t(`priority.${task.priority ?? 'medium'}`) })}
        </span>
        <button
          type="button"
          onClick={onToggleLike}
          disabled={!canLike}
          aria-label={likedByUser ? t('likedTask') : t('likeTask')}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
            likedByUser
              ? 'border-primary/40 bg-primary/5 text-primary'
              : 'border-border text-muted-foreground'
          } ${canLike ? 'hover:border-primary hover:text-primary' : 'cursor-default'}`}
        >
          <Heart className={`h-3.5 w-3.5 ${likedByUser ? 'fill-current' : ''}`} />
          {likeCount}
        </button>
      </div>

      {/* Compact 2x2 metadata grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{t('sprint')}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {task.sprint ? task.sprint.name : t('noSprint')}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{tTasks('labelTaskType')}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {tTasks(`taskTypes.${task.task_type ?? 'custom'}`)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{t('pointsLabel', { points: task.points ?? 0 })}</p>
          <p
            className="mt-0.5 text-sm font-medium font-mono tabular-nums text-foreground"
            data-testid="task-estimated-xp-chip"
          >
            {t('estimatedXpLabel', { xp: estimatedTaskXp })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{t('created')}</p>
          <p className="mt-0.5 text-sm font-mono tabular-nums text-foreground">
            {task.created_at ? formatDate(task.created_at) : '-'}
          </p>
        </div>
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {task.labels.map((label, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-foreground"
            >
              <Tag className="h-3 w-3" />
              {getLabelDisplay(label, t)}
            </span>
          ))}
        </div>
      )}

      {/* Participants — overlapping avatar stack */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t('participants')}</p>
          {participants.length > 0 && (
            <span className="text-xs text-muted-foreground">{tTasks('participantCount', { count: participants.length })}</span>
          )}
        </div>
        {participants.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t('noParticipants')}</p>
        ) : (
          <div className="mt-1.5">
            <AvatarStack
              users={participants
                .filter((a) => a.user)
                .map((a) => ({
                  id: a.user!.id ?? a.id,
                  avatar_url: a.user!.avatar_url,
                  name: a.user!.name,
                  email: a.user!.email,
                  organic_id: a.user!.organic_id,
                }))}
            />
          </div>
        )}
      </div>

      {/* Contributors — avatar stack */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t('contributors')}</p>
          {contributors.length > 3 && (
            <button
              type="button"
              onClick={onToggleContributors}
              className="text-xs text-primary hover:text-primary/80"
            >
              {showAllContributors ? t('showLess') : t('viewAll')}
            </button>
          )}
        </div>
        {contributors.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t('noContributors')}</p>
        ) : (
          <div className="mt-1.5">
            <AvatarStack
              users={(showAllContributors ? contributors : contributors.slice(0, 4)).map((c) => ({
                id: c.id ?? '',
                avatar_url: c.avatar_url,
                name: c.name,
                email: c.email,
                organic_id: c.organic_id,
              }))}
              maxVisible={showAllContributors ? 20 : 4}
            />
            {contributors.length > 0 && (
              <button
                type="button"
                onClick={onOpenContributorsModal}
                className="mt-1 text-xs text-primary hover:text-primary/80"
              >
                {t('submissionsCount', { count: task.submissions?.length ?? 0 })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
