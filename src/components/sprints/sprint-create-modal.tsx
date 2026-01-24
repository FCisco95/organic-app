'use client';

import { AlertCircle, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SprintFormData } from '@/features/tasks';

type SprintCreateModalProps = {
  open: boolean;
  error: string | null;
  submitting: boolean;
  formData: SprintFormData;
  onChange: (next: SprintFormData) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function SprintCreateModal({
  open,
  error,
  submitting,
  formData,
  onChange,
  onClose,
  onSubmit,
}: SprintCreateModalProps) {
  const t = useTranslations('Sprints');

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('modalTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('formName')}
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              placeholder={t('formNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
            />
          </div>

          <div>
            <label htmlFor="start_at" className="block text-sm font-medium text-gray-700 mb-1">
              {t('formStartDate')}
            </label>
            <input
              type="date"
              id="start_at"
              required
              value={formData.start_at}
              onChange={(e) => onChange({ ...formData, start_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
            />
          </div>

          <div>
            <label htmlFor="end_at" className="block text-sm font-medium text-gray-700 mb-1">
              {t('formEndDate')}
            </label>
            <input
              type="date"
              id="end_at"
              required
              value={formData.end_at}
              onChange={(e) => onChange({ ...formData, end_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              {t('formStatus')}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                onChange({
                  ...formData,
                  status: e.target.value as 'planning' | 'active' | 'completed',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
            >
              <option value="planning">{t('status.planning')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="completed">{t('status.completed')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="capacity_points"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('formCapacity')}
            </label>
            <input
              type="number"
              id="capacity_points"
              min="0"
              value={formData.capacity_points}
              onChange={(e) =>
                onChange({
                  ...formData,
                  capacity_points: e.target.value,
                })
              }
              placeholder={t('formCapacityPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">{t('formCapacityHelper')}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-organic-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('creating')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('createSprint')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
