'use client';

import { useTranslations } from 'next-intl';

interface DisputeResolutionNotesProps {
  resolutionNotes: string;
  newQualityScore?: number | null;
}

export function DisputeResolutionNotes({
  resolutionNotes,
  newQualityScore,
}: DisputeResolutionNotesProps) {
  const td = useTranslations('Disputes.detail');

  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50/30 p-4">
      <h3 className="mb-2 text-sm font-semibold text-green-900">{td('resolutionSection')}</h3>
      <p className="text-sm text-green-800">{resolutionNotes}</p>
      {newQualityScore && (
        <p className="mt-1 text-sm text-green-700">
          {td('qualityScore')}: {newQualityScore}/5
        </p>
      )}
    </div>
  );
}
