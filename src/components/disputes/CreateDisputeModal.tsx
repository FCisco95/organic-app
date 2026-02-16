'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useCreateDispute, useDisputeEligibility } from '@/features/disputes/hooks';
import type { DisputeReason } from '@/features/disputes/types';
import { DISPUTE_REASON_LABELS } from '@/features/disputes/types';
import { AlertCircle, X, Plus, Loader2, Upload, Paperclip } from 'lucide-react';

interface CreateDisputeModalProps {
  submissionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASONS: DisputeReason[] = [
  'rejected_unfairly',
  'low_quality_score',
  'plagiarism_claim',
  'reviewer_bias',
  'other',
];
const MAX_EVIDENCE_FILES = 5;

type UploadedEvidenceFile = {
  path: string;
  name: string;
  size: number;
};

export function CreateDisputeModal({
  submissionId,
  onClose,
  onSuccess,
}: CreateDisputeModalProps) {
  const t = useTranslations('Disputes');
  const tf = useTranslations('Disputes.form');

  const { data: eligibility, isLoading: checkingEligibility } =
    useDisputeEligibility(submissionId);
  const createDispute = useCreateDispute();

  const [reason, setReason] = useState<DisputeReason | ''>('');
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedEvidenceFile[]>([]);
  const [newLink, setNewLink] = useState('');
  const [requestMediation, setRequestMediation] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const evidenceFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddLink = () => {
    if (newLink.trim()) {
      setEvidenceLinks((prev) => [...prev, newLink.trim()]);
      setNewLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setEvidenceLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason || evidenceText.length < 20) return;

    try {
      await createDispute.mutateAsync({
        submission_id: submissionId,
        reason,
        evidence_text: evidenceText,
        evidence_links: evidenceLinks,
        evidence_files: evidenceFiles.map((file) => file.path),
        request_mediation: requestMediation,
      });
      onSuccess?.();
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleEvidenceFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsUploadingEvidence(true);

    try {
      const remaining = MAX_EVIDENCE_FILES - evidenceFiles.length;
      const selectedFiles = Array.from(files).slice(0, Math.max(remaining, 0));

      if (selectedFiles.length === 0) {
        setUploadError(tf('maxEvidenceFiles'));
        return;
      }

      const uploaded: UploadedEvidenceFile[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/disputes/evidence', {
          method: 'POST',
          body: formData,
        });
        const result = (await response.json()) as {
          error?: string;
          data?: UploadedEvidenceFile;
        };

        if (!response.ok || !result.data) {
          throw new Error(result.error || tf('uploadFailed'));
        }

        uploaded.push(result.data);
      }

      setEvidenceFiles((prev) => [...prev, ...uploaded]);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : tf('uploadFailed')
      );
    } finally {
      setIsUploadingEvidence(false);
      if (evidenceFileInputRef.current) {
        evidenceFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveEvidenceFile = (path: string) => {
    setEvidenceFiles((prev) => prev.filter((file) => file.path !== path));
  };

  const isEligible = eligibility?.eligible;
  const canSubmit =
    isEligible &&
    reason &&
    evidenceText.length >= 20 &&
    !createDispute.isPending &&
    !isUploadingEvidence;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('createTitle')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('createDescription')}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Eligibility check */}
          {checkingEligibility ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking eligibility...
            </div>
          ) : !isEligible ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{eligibility?.reason}</span>
            </div>
          ) : null}

          {/* XP stake info */}
          {eligibility && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {t('xpStake')}: {eligibility.xp_stake} XP
                </p>
                <p className="text-xs mt-0.5 text-amber-600">
                  {t('xpStakeInfo')}
                </p>
                <p className="text-xs mt-0.5 text-amber-600">
                  Your XP: {eligibility.user_xp}
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {tf('reason')}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as DisputeReason)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={!isEligible}
            >
              <option value="">{tf('reasonPlaceholder')}</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {DISPUTE_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Evidence text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {tf('evidence')}
            </label>
            <textarea
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              placeholder={tf('evidencePlaceholder')}
              rows={5}
              maxLength={5000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={!isEligible}
            />
            <p className="text-xs text-gray-400 mt-1">
              {evidenceText.length}/5000
            </p>
          </div>

          {/* Evidence links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {tf('evidenceLinks')}
            </label>
            <div className="flex gap-2">
              <input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder={tf('evidenceLinksPlaceholder')}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={!isEligible}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLink}
                disabled={!newLink.trim() || !isEligible}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {evidenceLinks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {evidenceLinks.map((link, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span className="truncate flex-1">{link}</span>
                    <button
                      onClick={() => handleRemoveLink(i)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Evidence files */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {tf('evidenceFiles')}
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={evidenceFileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.pdf,.txt"
                onChange={(event) => handleEvidenceFileUpload(event.target.files)}
                disabled={!isEligible || isUploadingEvidence}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  !isEligible ||
                  isUploadingEvidence ||
                  evidenceFiles.length >= MAX_EVIDENCE_FILES
                }
                onClick={() => evidenceFileInputRef.current?.click()}
              >
                {isUploadingEvidence ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploadingEvidence ? tf('uploadingEvidence') : tf('uploadEvidence')}
              </Button>
              <span className="text-xs text-gray-500">
                {evidenceFiles.length}/{MAX_EVIDENCE_FILES}
              </span>
            </div>
            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}
            {evidenceFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {evidenceFiles.map((file) => (
                  <li
                    key={file.path}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate flex-1">{file.name}</span>
                    <button
                      onClick={() => handleRemoveEvidenceFile(file.path)}
                      className="text-gray-400 hover:text-red-500"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Request mediation */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requestMediation}
              onChange={(e) => setRequestMediation(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              disabled={!isEligible}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                {tf('requestMediation')}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                {tf('requestMediationHint')}
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {createDispute.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {t('fileDispute')}
          </Button>
        </div>

        {/* Error */}
        {createDispute.isError && (
          <div className="px-5 pb-4">
            <p className="text-sm text-red-600">
              {createDispute.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
