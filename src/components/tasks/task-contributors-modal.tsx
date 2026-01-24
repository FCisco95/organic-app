'use client';

import { useTranslations } from 'next-intl';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';

type Contributor = NonNullable<TaskSubmissionWithReviewer['user']>;

type TaskContributorsModalProps = {
  open: boolean;
  contributors: Contributor[];
  submissionCount: number;
  onClose: () => void;
};

export function TaskContributorsModal({
  open,
  contributors,
  submissionCount,
  onClose,
}: TaskContributorsModalProps) {
  const t = useTranslations('TaskDetail');

  if (!open) return null;

  const getContributorName = (contributor: Contributor) => {
    if (contributor.organic_id) return t('organicId', { id: contributor.organic_id });
    return contributor.name ?? contributor.email;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('contributorsModalTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {t('submissionsCount', { count: submissionCount })}
        </p>
        <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
          {contributors.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noContributors')}</p>
          ) : (
            contributors.map((contributor) => (
              <div
                key={contributor.id}
                className="px-3 py-2 rounded-md bg-gray-50 text-sm text-gray-700"
              >
                {getContributorName(contributor)}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
