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

/**
 * Strip UUID prefix from evidence filenames.
 * E.g. "1772036242459-264883e1-75fb-41db-80a6-e23a7d653758-surface-late-evidence.png"
 *   -> "surface-late-evidence.png"
 */
function cleanFileName(raw: string): string {
  // Match: timestamp-uuid-rest pattern
  const cleaned = raw.replace(
    /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    ''
  );
  return cleaned || raw;
}

/** Truncate filename to ~30 chars, keeping extension */
function truncateFileName(name: string, max: number = 30): string {
  if (name.length <= max) return name;
  const extIdx = name.lastIndexOf('.');
  const ext = extIdx > 0 ? name.slice(extIdx) : '';
  const base = extIdx > 0 ? name.slice(0, extIdx) : name;
  const availableChars = max - ext.length - 3; // 3 for "..."
  if (availableChars <= 0) return name.slice(0, max);
  return base.slice(0, availableChars) + '...' + ext;
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
      className="space-y-4"
    >
      {/* Evidence text */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
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
      </div>

      {/* Uploaded files — cleaned filenames */}
      {evidenceFileUrls.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {td('evidenceFiles')}
          </p>
          <ul className="space-y-1.5">
            {evidenceFileUrls.map((file) => {
              const cleanName = cleanFileName(file.file_name);
              const displayName = truncateFileName(cleanName);
              return (
                <li key={file.path}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={cleanName}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    {displayName}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Evidence timeline */}
      {evidenceEvents.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {td('evidenceTimeline')}
          </p>
          <ul className="space-y-2">
            {evidenceEvents.map((event) => {
              const cleanName = cleanFileName(event.file_name);
              const displayName = truncateFileName(cleanName);
              return (
                <li
                  key={event.id}
                  data-testid={`dispute-evidence-event-${event.id}`}
                  className="flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs"
                >
                  <Paperclip className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {event.url ? (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={cleanName}
                          className="truncate text-blue-600 hover:underline"
                        >
                          {displayName}
                        </a>
                      ) : (
                        <span className="truncate" title={cleanName}>{displayName}</span>
                      )}
                      {event.is_late && (
                        <span
                          data-testid="dispute-late-evidence-tag"
                          className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700"
                        >
                          {td('lateEvidenceTag')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      {td('uploadedAt', { date: formatDateTime(event.created_at) ?? '\u2014' })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Upload button */}
      {canUploadEvidence && (
        <div>
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
