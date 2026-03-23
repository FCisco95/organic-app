'use client';

import { useTranslations } from 'next-intl';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

  const getContributorName = (contributor: Contributor) => {
    if (contributor.organic_id) return t('organicId', { id: contributor.organic_id });
    return contributor.name ?? contributor.email;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900">{t('contributorsModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('submissionsCount', { count: submissionCount })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-2">
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
      </DialogContent>
    </Dialog>
  );
}
