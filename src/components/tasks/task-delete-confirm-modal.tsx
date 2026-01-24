'use client';

import { useTranslations } from 'next-intl';

type TaskDeleteConfirmModalProps = {
  open: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function TaskDeleteConfirmModal({
  open,
  isDeleting,
  onCancel,
  onConfirm,
}: TaskDeleteConfirmModalProps) {
  const t = useTranslations('TaskDetail');

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{t('deleteTitle')}</h3>
        <p className="text-gray-600 mb-6">{t('deleteDescription')}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isDeleting ? t('deleting') : t('deleteTask')}
          </button>
        </div>
      </div>
    </div>
  );
}
