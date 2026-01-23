'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/context';
import { usePendingReviewSubmissions } from '@/features/tasks/hooks';
import { TaskReviewPanel } from '@/components/tasks/task-review-panel';
import { TASK_TYPE_LABELS, TaskSubmissionWithReviewer, TaskType } from '@/features/tasks';
import { Link } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';

type PendingSubmission = TaskSubmissionWithReviewer & {
  task: {
    id: string;
    title: string;
    task_type: TaskType | null;
    base_points: number | null;
  };
};

type SubmissionGroup = {
  task: PendingSubmission['task'];
  submissions: TaskSubmissionWithReviewer[];
};

export default function SubmissionReviewQueuePage() {
  const t = useTranslations('ReviewQueue');
  const { profile, loading: authLoading } = useAuth();
  const { data, isLoading, error } = usePendingReviewSubmissions();

  const canReview = !!profile?.role && ['admin', 'council'].includes(profile.role);

  const groups = useMemo(() => {
    const submissions = (data ?? []) as PendingSubmission[];
    return submissions.reduce<Record<string, SubmissionGroup>>((acc, submission) => {
      const task = submission.task;
      if (!task) return acc;
      if (!acc[task.id]) {
        acc[task.id] = { task, submissions: [] };
      }
      acc[task.id].submissions.push(submission);
      return acc;
    }, {});
  }, [data]);

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        </div>
      </main>
    );
  }

  if (!canReview) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">{t('accessDeniedTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('accessDeniedDescription')}</p>
            <Link
              href="/tasks"
              className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-organic-orange text-white font-medium hover:bg-orange-600 transition-colors"
            >
              {t('backToTasks')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const groupList = Object.values(groups);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {t('loadError')}
          </div>
        )}

        {groupList.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900">{t('emptyTitle')}</h2>
            <p className="text-gray-600 mt-2">{t('emptyDescription')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupList.map((group) => {
              const taskType = group.task.task_type ?? 'custom';
              const basePoints = group.task.base_points ?? 0;
              return (
                <section key={group.task.id} className="bg-white rounded-xl border border-gray-200">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {t('taskLabel')}
                        </p>
                        <Link
                          href={`/tasks/${group.task.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-organic-orange transition-colors"
                        >
                          {group.task.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {TASK_TYPE_LABELS[taskType]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {t('pendingCount', { count: group.submissions.length })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <TaskReviewPanel submissions={group.submissions} basePoints={basePoints} />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
