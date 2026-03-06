'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Loader2, Paperclip, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DisputeWithRelations } from '@/features/disputes/types';
import { useUploadDisputeEvidence } from '@/features/disputes/hooks';
import { formatDateTime } from './utils';

interface DisputeEvidenceSectionProps {
  dispute: DisputeWithRelations;
  canUploadEvidence: boolean;
  onRefresh: () => void;
}

export function DisputeEvidenceSection({
  dispute,
  canUploadEvidence,
  onRefresh,
}: DisputeEvidenceSectionProps) {
  const t = useTranslations('Disputes');
  const td = useTranslations('Disputes.detail');
  const uploadDisputeEvidence = useUploadDisputeEvidence();

  const evidenceLinks = Array.isArray(dispute.evidence_links) ? dispute.evidence_links : [];
  const evidenceFileUrls = Array.isArray(dispute.evidence_file_urls)
    ? dispute.evidence_file_urls
    : [];
  const evidenceEvents = Array.isArray(dispute.evidence_events) ? dispute.evidence_events : [];

  const evidenceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [evidenceUploadError, setEvidenceUploadError] = useState<string | null>(null);

  const handleDisputeEvidenceUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setEvidenceUploadError(null);
    try {
      await uploadDisputeEvidence.mutateAsync({
        file: files[0],
        metadata: { dispute_id: dispute.id },
      });
      onRefresh();
    } catch (error) {
      setEvidenceUploadError(error instanceof Error ? error.message : t('form.uploadFailed'));
    } finally {
      if (evidenceFileInputRef.current) {
        evidenceFileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      data-testid="dispute-evidence-chronology"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{td('evidence')}</h3>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{dispute.evidence_text ?? '\u2014'}</p>

      {evidenceLinks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {evidenceLinks.map((link, i) => (
            <li key={i}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                {link}
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {evidenceFileUrls.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-500">{td('evidenceFiles')}</p>
          <ul className="space-y-1">
            {evidenceFileUrls.map((file) => (
              <li key={file.path}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Paperclip className="h-3 w-3" />
                  {file.file_name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceEvents.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-500">{td('evidenceTimeline')}</p>
          <ul className="space-y-2">
            {evidenceEvents.map((event) => (
              <li
                key={event.id}
                data-testid={`dispute-evidence-event-${event.id}`}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-3 w-3 shrink-0 text-gray-400" />
                  {event.url ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline"
                    >
                      {event.file_name}
                    </a>
                  ) : (
                    <span className="truncate">{event.file_name}</span>
                  )}
                  {event.is_late && (
                    <span
                      data-testid="dispute-late-evidence-tag"
                      className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700"
                    >
                      {td('lateEvidenceTag')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-gray-500">
                  {td('uploadedAt', { date: formatDateTime(event.created_at) ?? '\u2014' })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canUploadEvidence && (
        <div className="mt-3">
          <input
            ref={evidenceFileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(event) => handleDisputeEvidenceUpload(event.target.files)}
            disabled={uploadDisputeEvidence.isPending}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => evidenceFileInputRef.current?.click()}
            disabled={uploadDisputeEvidence.isPending}
          >
            {uploadDisputeEvidence.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            {uploadDisputeEvidence.isPending
              ? t('form.uploadingEvidence')
              : t('form.uploadEvidence')}
          </Button>
          {evidenceUploadError && <p className="mt-1 text-xs text-red-600">{evidenceUploadError}</p>}
        </div>
      )}
    </div>
  );
}
