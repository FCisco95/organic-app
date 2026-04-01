'use client';

import { Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function FormActions({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean;
  onCancel?: () => void;
}) {
  const t = useTranslations('Tasks.submission');

  return (
    <div className="flex gap-3 pt-4">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="task-submission-submit"
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cta hover:bg-cta-hover text-cta-fg rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {isSubmitting ? t('submitting') : t('submitWork')}
      </button>
    </div>
  );
}
