'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { ExternalLink, User, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { DisputeWithRelations, DisputeStatus, DisputeTier, DisputeResolution } from '@/features/disputes/types';
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
} from '@/features/disputes/hooks';

interface DisputeDetailProps {
  dispute: DisputeWithRelations;
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
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

  const isDisputant = currentUserId === dispute.disputant_id;
  const isReviewer = currentUserId === dispute.reviewer_id;
  const isArbitrator = currentUserId === dispute.arbitrator_id;
  const isAdmin = currentUserRole === 'admin';
  const isCouncil = currentUserRole === 'council';
  const isTerminal = TERMINAL_STATUSES.includes(dispute.status);

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

  const renderUser = (
    label: string,
    user?: { name?: string | null; email?: string; organic_id?: number | null; avatar_url?: string | null } | null
  ) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20">{label}</span>
      {user ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="text-[10px] bg-gray-200">
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <DisputeStatusBadge status={dispute.status as DisputeStatus} />
          <DisputeTierBadge tier={dispute.tier as DisputeTier} />
          {dispute.resolution && (
            <span className="text-sm font-medium text-gray-700">
              {DISPUTE_RESOLUTION_LABELS[dispute.resolution as DisputeResolution]}
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {dispute.task?.title || td('task')}
        </h1>

        <p className="text-sm text-gray-500">
          {t(`reason.${dispute.reason}`)} &middot;{' '}
          {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Timeline */}
      <DisputeTimeline
        status={dispute.status as DisputeStatus}
        tier={dispute.tier}
      />

      {/* Parties */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        {renderUser(td('disputant'), dispute.disputant)}
        {renderUser(td('reviewer'), dispute.reviewer)}
        {renderUser(td('arbitrator'), dispute.arbitrator)}

        {dispute.task && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">{td('task')}</span>
            <Link
              href={`/tasks/${dispute.task.id}`}
              className="text-sm text-orange-600 hover:underline flex items-center gap-1"
            >
              {dispute.task.title}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Evidence */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          {td('evidence')}
        </h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {dispute.evidence_text}
        </p>
        {dispute.evidence_links.length > 0 && (
          <ul className="mt-3 space-y-1">
            {dispute.evidence_links.map((link, i) => (
              <li key={i}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {link}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reviewer response */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          {td('reviewerResponse')}
        </h3>
        {dispute.response_text ? (
          <>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {dispute.response_text}
            </p>
            {dispute.response_links.length > 0 && (
              <ul className="mt-3 space-y-1">
                {dispute.response_links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {link}
                      <ExternalLink className="w-3 h-3" />
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
              <p className="flex items-center gap-1 mt-1 text-xs">
                <Clock className="w-3 h-3" />
                {td('responseDeadline', {
                  date: format(new Date(dispute.response_deadline), 'PPp'),
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Original review info */}
      {dispute.submission && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {td('originalReview')}
          </h3>
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
              <p className="text-gray-500 italic">
                {dispute.submission.reviewer_notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resolution */}
      {dispute.resolution_notes && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50/30 p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-2">
            {td('resolutionSection')}
          </h3>
          <p className="text-sm text-green-800">{dispute.resolution_notes}</p>
          {dispute.new_quality_score && (
            <p className="text-sm text-green-700 mt-1">
              {td('qualityScore')}: {dispute.new_quality_score}/5
            </p>
          )}
        </div>
      )}

      {/* Action panels */}
      {canRespond && <RespondPanel disputeId={dispute.id} onSuccess={onRefresh} />}
      {canResolve && <ResolvePanel disputeId={dispute.id} onSuccess={onRefresh} />}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {canAssign && (
          <Button
            onClick={() => assignArbitrator.mutate(dispute.id, { onSuccess: onRefresh })}
            disabled={assignArbitrator.isPending}
            variant="outline"
          >
            <User className="w-4 h-4 mr-1.5" />
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
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {t('appealDispute')}
          </Button>
        )}
      </div>
    </div>
  );
}
