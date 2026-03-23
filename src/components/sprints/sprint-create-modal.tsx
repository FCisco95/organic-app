'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SprintFormData } from '@/features/sprints';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-lg bg-white border-gray-200 p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base font-semibold text-gray-900">{t('modalTitle')}</DialogTitle>
            <DialogDescription className="sr-only">{t('modalTitle')}</DialogDescription>
          </DialogHeader>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">
              {t('formName')}
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              placeholder={t('formNamePlaceholder')}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Goal */}
          <div>
            <label htmlFor="goal" className="block text-xs font-medium text-gray-600 mb-1">
              {t('formGoal')}
            </label>
            <textarea
              id="goal"
              rows={2}
              value={formData.goal}
              onChange={(e) => onChange({ ...formData, goal: e.target.value })}
              placeholder={t('formGoalPlaceholder')}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Dates side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="start_at" className="block text-xs font-medium text-gray-600 mb-1">
                {t('formStartDate')}
              </label>
              <input
                type="date"
                id="start_at"
                required
                value={formData.start_at}
                onChange={(e) => onChange({ ...formData, start_at: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end_at" className="block text-xs font-medium text-gray-600 mb-1">
                {t('formEndDate')}
              </label>
              <input
                type="date"
                id="end_at"
                required
                value={formData.end_at}
                onChange={(e) => onChange({ ...formData, end_at: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label
              htmlFor="capacity_points"
              className="block text-xs font-medium text-gray-600 mb-1"
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
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-gray-400">{t('formCapacityHelper')}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-md border border-organic-orange bg-organic-orange px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('creating')}
                </>
              ) : (
                t('createSprint')
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
