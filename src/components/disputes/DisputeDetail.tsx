'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  FileClock,
  Loader2,
  Paperclip,
  ShieldAlert,
  Upload,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { DisputeWithRelations, DisputeResolution } from '@/features/disputes/types';
import { DISPUTE_RESOLUTION_LABELS, TERMINAL_STATUSES } from '@/features/disputes/types';
import { DisputeStatusBadge } from './DisputeStatusBadge';
import { DisputeTierBadge } from './DisputeTierBadge';
import { DisputeTimeline } from './DisputeTimeline';
import { RespondPanel } from './RespondPanel';
import { ResolvePanel } from './ResolvePanel';
import {
  useWithdrawDispute,
  useAppealDispute,
  useAssignArbitrator,
  useMediateDispute,
  useUploadDisputeEvidence,
} from '@/features/disputes/hooks';
import { cn } from '@/lib/utils';
import { getDisputeSlaUrgency, isDeadlinePast } from '@/features/disputes/sla';

interface DisputeDetailProps {
  dispute: DisputeWithRelations;
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'recently';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'recently';
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return format(date, 'PPp');
}

export function DisputeDetail({
  dispute,
  currentUserId,
  currentUserRole,
  onRefresh,
}: DisputeDetailProps) {
  const t = useTranslations('Disputes');
  const td = useTranslations('Disputes.detail');
  const withdraw = useWithdrawDispute();
  const appeal = useAppealDispute();
  const assignArbitrator = useAssignArbitrator();
  const mediate = useMediateDispute();
  const uploadDisputeEvidence = useUploadDisputeEvidence();

  const isDisputant = currentUserId === dispute.disputant_id;
  const isReviewer = currentUserId === dispute.reviewer_id;
  const isArbitrator = currentUserId === dispute.arbitrator_id;
  const isAdmin = currentUserRole === 'admin';
  const isCouncil = currentUserRole === 'council';
  const isTerminal = TERMINAL_STATUSES.includes(dispute.status);

  const canUploadEvidence =
    (isDisputant || isReviewer || isArbitrator || isAdmin || isCouncil) && !isTerminal;
  const canRespond =
    isReviewer &&
    !dispute.response_submitted_at &&
    ['open', 'mediation', 'awaiting_response'].includes(dispute.status);
  const canResolve =
    (isArbitrator || isAdmin) &&
    ['under_review', 'appeal_review'].includes(dispute.status) &&
    dispute.reviewer_id !== currentUserId;
  const canAssign =
    (isCouncil || isAdmin) &&
    !isReviewer &&
    !dispute.arbitrator_id &&
    ['open', 'awaiting_response', 'under_review', 'appealed'].includes(dispute.status);
  const canWithdraw = isDisputant && !isTerminal;
  const canAppeal =
    isDisputant &&
    dispute.tier !== 'admin' &&
    (dispute.status === 'resolved' || dispute.status === 'dismissed');
  const canMediate =
    (isDisputant || isReviewer) &&
    ['open', 'mediation', 'awaiting_response'].includes(dispute.status);

  const evidenceLinks = Array.isArray(dispute.evidence_links) ? dispute.evidence_links : [];
  const evidenceFileUrls = Array.isArray(dispute.evidence_file_urls)
    ? dispute.evidence_file_urls
    : [];
  const evidenceEvents = Array.isArray(dispute.evidence_events) ? dispute.evidence_events : [];
  const lateEvidenceCount = evidenceEvents.filter((event) => event.is_late).length;
  const responseLinks = Array.isArray(dispute.response_links) ? dispute.response_links : [];

  const evidenceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [evidenceUploadError, setEvidenceUploadError] = useState<string | null>(null);

  const responseDeadlineLabel = formatDateTime(dispute.response_deadline);
  const responseSubmittedLabel = formatDateTime(dispute.response_submitted_at);
  const disputeWindowLabel = formatDateTime(dispute.sprint?.dispute_window_ends_at ?? null);
  const responseSlaUrgency = getDisputeSlaUrgency(dispute.response_deadline);
  const responseIsOverdue = isDeadlinePast(dispute.response_deadline);
  const resolutionLabel = dispute.resolution
    ? DISPUTE_RESOLUTION_LABELS[dispute.resolution as DisputeResolution]
    : null;

  const reasonLabel =
    dispute.reason in {
      rejected_unfairly: true,
      low_quality_score: true,
      plagiarism_claim: true,
      reviewer_bias: true,
      other: true,
    }
      ? t(`reason.${dispute.reason}`)
      : dispute.reason;

  const responsePostureLabel = responseSubmittedLabel
    ? td('responseSubmittedAt', { date: responseSubmittedLabel })
    : responseDeadlineLabel
      ? responseIsOverdue
        ? td('responseOverdue', { date: responseDeadlineLabel })
        : td('responseDue', { date: responseDeadlineLabel })
      : td('responseNoDeadline');

  const escalationPosture = responseIsOverdue && dispute.tier !== 'admin';

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

  const renderUser = (
    label: string,
    user?: {
      name?: string | null;
      email?: string;
      organic_id?: number | null;
      avatar_url?: string | null;
    } | null
  ) => (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-gray-500">{label}</span>
      {user ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="bg-gray-200 text-[10px]">
              {(user.name || user.email || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-900">
            {user.name || (user.organic_id ? `ORG-${user.organic_id}` : user.email?.split('@')[0])}
          </span>
        </div>
      ) : (
        <span className="text-sm text-gray-400">{td('unassigned')}</span>
      )}
    </div>
  );

  return (
    <div data-testid="dispute-detail-surface" className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <DisputeStatusBadge status={dispute.status} />
          <DisputeTierBadge tier={dispute.tier} />
          {resolutionLabel && (
            <span className="text-sm font-medium text-gray-700">{resolutionLabel}</span>
          )}
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              responseSlaUrgency === 'overdue'
                ? 'border-red-200 bg-red-100 text-red-700'
                : responseSlaUrgency === 'at_risk'
                  ? 'border-amber-200 bg-amber-100 text-amber-700'
                  : responseSlaUrgency === 'on_track'
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-gray-200 bg-gray-100 text-gray-600'
            )}
          >
            {responseSlaUrgency === 'overdue'
              ? t('triage.overdue')
              : responseSlaUrgency === 'at_risk'
                ? t('triage.atRisk')
                : responseSlaUrgency === 'on_track'
                  ? t('triage.onTrack')
                  : t('triage.noDeadline')}
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-gray-900">{dispute.task?.title || td('task')}</h1>
        <p className="text-sm text-gray-500">
          {reasonLabel} &middot; {formatRelativeTime(dispute.created_at)}
        </p>
      </div>

      <div
        data-testid="dispute-detail-operator-grid"
        className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <DisputeTimeline
              status={dispute.status}
              tier={dispute.tier}
              responseDeadline={dispute.response_deadline}
              disputeWindowEndsAt={dispute.sprint?.dispute_window_ends_at ?? null}
              lateEvidenceCount={lateEvidenceCount}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
            {renderUser(td('disputant'), dispute.disputant)}
            {renderUser(td('reviewer'), dispute.reviewer)}
            {renderUser(td('arbitrator'), dispute.arbitrator)}

            {dispute.task && (
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-500">{td('task')}</span>
                <Link
                  href={`/tasks/${dispute.task.id}`}
                  className="flex items-center gap-1 text-sm text-orange-600 hover:underline"
                >
                  {dispute.task.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          <div
            data-testid="dispute-evidence-chronology"
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <h3 className="mb-2 text-sm font-semibold text-gray-900">{td('evidence')}</h3>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{dispute.evidence_text ?? '—'}</p>

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
                        {td('uploadedAt', { date: formatDateTime(event.created_at) ?? '—' })}
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

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">{td('reviewerResponse')}</h3>
            {dispute.response_text ? (
              <>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{dispute.response_text}</p>
                {responseLinks.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {responseLinks.map((link, i) => (
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
              </>
            ) : (
              <div className="text-sm text-gray-400">
                <p>{td('noResponse')}</p>
                {dispute.response_deadline && (
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {td('responseDeadline', { date: formatDateTime(dispute.response_deadline) ?? '—' })}
                  </p>
                )}
              </div>
            )}
          </div>

          {dispute.submission && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{td('originalReview')}</h3>
              <div className="space-y-1 text-sm text-gray-700">
                {dispute.submission.quality_score && (
                  <p>
                    {td('qualityScore')}: {dispute.submission.quality_score}/5
                  </p>
                )}
                {dispute.submission.rejection_reason && (
                  <p>
                    {td('rejectionReason')}: {dispute.submission.rejection_reason}
                  </p>
                )}
                {dispute.submission.reviewer_notes && (
                  <p className="italic text-gray-500">{dispute.submission.reviewer_notes}</p>
                )}
              </div>
            </div>
          )}

          {dispute.resolution_notes && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50/30 p-4">
              <h3 className="mb-2 text-sm font-semibold text-green-900">{td('resolutionSection')}</h3>
              <p className="text-sm text-green-800">{dispute.resolution_notes}</p>
              {dispute.new_quality_score && (
                <p className="mt-1 text-sm text-green-700">
                  {td('qualityScore')}: {dispute.new_quality_score}/5
                </p>
              )}
            </div>
          )}

          {canRespond && <RespondPanel disputeId={dispute.id} onSuccess={onRefresh} />}
          {canResolve && <ResolvePanel disputeId={dispute.id} onSuccess={onRefresh} />}

          <div className="flex flex-wrap gap-3">
            {canAssign && (
              <Button
                onClick={() => assignArbitrator.mutate(dispute.id, { onSuccess: onRefresh })}
                disabled={assignArbitrator.isPending}
                variant="outline"
              >
                <User className="mr-1.5 h-4 w-4" />
                {t('assignSelf')}
              </Button>
            )}

            {canMediate && (
              <Button
                onClick={() =>
                  mediate.mutate(
                    { disputeId: dispute.id, input: { agreed_outcome: 'Mediated resolution' } },
                    { onSuccess: onRefresh }
                  )
                }
                disabled={mediate.isPending}
                variant="outline"
              >
                {t('mediate')}
              </Button>
            )}

            {canWithdraw && (
              <Button
                onClick={() => withdraw.mutate(dispute.id, { onSuccess: onRefresh })}
                disabled={withdraw.isPending}
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                {t('withdrawDispute')}
              </Button>
            )}

            {canAppeal && (
              <Button
                onClick={() =>
                  appeal.mutate(
                    { disputeId: dispute.id, input: { appeal_reason: 'Appealing council ruling' } },
                    { onSuccess: onRefresh }
                  )
                }
                disabled={appeal.isPending}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {t('appealDispute')}
              </Button>
            )}
          </div>
        </div>

        <aside data-testid="dispute-integrity-rail" className="space-y-3">
          <div
            data-testid="dispute-response-deadline-panel"
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-900">{td('integrity.responseDeadlineTitle')}</h3>
            </div>
            <p className="text-sm text-gray-700">{responsePostureLabel}</p>
            {disputeWindowLabel && (
              <p className="mt-1 text-xs text-gray-500">
                {td('integrity.disputeWindow', { date: disputeWindowLabel })}
              </p>
            )}
          </div>

          <div
            data-testid="dispute-evidence-chronology-panel"
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <FileClock className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">{td('integrity.evidenceChronologyTitle')}</h3>
            </div>
            <p className="text-sm text-gray-700">
              {td('integrity.evidenceSummary', {
                files: evidenceFileUrls.length,
                events: evidenceEvents.length,
              })}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {td('integrity.lateEvidenceSummary', { count: lateEvidenceCount })}
            </p>
          </div>

          <div
            data-testid="dispute-response-status-panel"
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">{td('integrity.responseStatusTitle')}</h3>
            </div>
            <p className="text-sm text-gray-700">{responsePostureLabel}</p>
            {escalationPosture ? (
              <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                {td('integrity.escalationRecommended')}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">{td('integrity.responseStatusHint')}</p>
            )}
          </div>

          <div
            data-testid="dispute-mediation-path-panel"
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">{td('integrity.mediationPathTitle')}</h3>
            </div>
            <p className="text-sm text-gray-700">
              {dispute.tier === 'mediation'
                ? td('integrity.mediationActive')
                : dispute.tier === 'council'
                  ? td('integrity.councilPath')
                  : td('integrity.adminPath')}
            </p>
            <p className="mt-2 text-xs text-gray-500">{td('integrity.mediationHint')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
