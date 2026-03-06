'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DisputeWithRelations } from '@/features/disputes/types';
import { TERMINAL_STATUSES } from '@/features/disputes/types';
import { DisputeTimeline } from './dispute-timeline';
import { RespondPanel } from './respond-panel';
import { ResolvePanel, type DisputeActionImpactSummary } from './resolve-panel';
import {
  useWithdrawDispute,
  useAppealDispute,
  useAssignArbitrator,
  useMediateDispute,
  useDisputeConfig,
} from '@/features/disputes/hooks';
import { getDisputeSlaUrgency, isDeadlinePast } from '@/features/disputes/sla';
import { useCheckLevelUp } from '@/features/reputation';
import { showAchievementToast } from '@/components/reputation/achievement-unlock-toast';
import { showLevelUpToast } from '@/components/reputation/level-up-toast';
import {
  DisputeHeader,
  DisputeParticipants,
  DisputeEvidenceSection,
  DisputeResponseSection,
  DisputeOriginalReview,
  DisputeResolutionNotes,
  DisputeActions,
  DisputeImpactSummary,
  DisputeIntegrityRail,
} from './dispute-detail';
import { formatDateTime } from './dispute-detail/utils';

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
  const tReputation = useTranslations('Reputation');
  const withdraw = useWithdrawDispute();
  const appeal = useAppealDispute();
  const assignArbitrator = useAssignArbitrator();
  const mediate = useMediateDispute();
  const checkLevelUp = useCheckLevelUp();
  const { data: disputeConfigData } = useDisputeConfig();

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

  const evidenceFileUrls = Array.isArray(dispute.evidence_file_urls)
    ? dispute.evidence_file_urls
    : [];
  const evidenceEvents = Array.isArray(dispute.evidence_events) ? dispute.evidence_events : [];
  const lateEvidenceCount = evidenceEvents.filter((event) => event.is_late).length;

  const [actionImpactSummary, setActionImpactSummary] = useState<DisputeActionImpactSummary | null>(
    null
  );

  const responseDeadlineLabel = formatDateTime(dispute.response_deadline);
  const responseSubmittedLabel = formatDateTime(dispute.response_submitted_at);
  const disputeWindowLabel = formatDateTime(dispute.sprint?.dispute_window_ends_at ?? null);
  const responseSlaUrgency = getDisputeSlaUrgency(dispute.response_deadline);
  const responseIsOverdue = isDeadlinePast(dispute.response_deadline);

  const responsePostureLabel = responseSubmittedLabel
    ? td('responseSubmittedAt', { date: responseSubmittedLabel })
    : responseDeadlineLabel
      ? responseIsOverdue
        ? td('responseOverdue', { date: responseDeadlineLabel })
        : td('responseDue', { date: responseDeadlineLabel })
      : td('responseNoDeadline');

  const escalationPosture = responseIsOverdue && dispute.tier !== 'admin';
  const disputeConfig = disputeConfigData?.data;
  const withdrawalFeeXp = disputeConfig?.xp_dispute_withdrawal_fee ?? 10;

  const maybeResolveAchievementName = (achievementId: string, fallback: string) => {
    try {
      return tReputation(`achievementNames.${achievementId}`);
    } catch {
      return fallback;
    }
  };

  const maybeResolveLevelName = (level: number) => {
    try {
      return tReputation(`levels.${level}`);
    } catch {
      return String(level);
    }
  };

  const runProgressionFeedback = async () => {
    try {
      const result = await checkLevelUp.mutateAsync();
      const newLevelName = maybeResolveLevelName(result.newLevel);

      if (result.leveledUp) {
        showLevelUpToast(result.newLevel, newLevelName, {
          title: tReputation('toast.levelUpTitle'),
          description: tReputation('toast.levelUp', {
            level: result.newLevel,
            name: newLevelName,
          }),
        });
      }

      result.newAchievements.forEach((achievement) => {
        const achievementName = maybeResolveAchievementName(
          achievement.achievement_id,
          achievement.achievement_name
        );
        showAchievementToast(achievementName, achievement.icon, achievement.xp_reward, {
          title: tReputation('toast.achievementUnlockedTitle'),
        });
      });
    } catch {
      // Feedback toasts are best-effort and should never block core dispute actions
    }
  };

  const handleMediate = async () => {
    try {
      const result = await mediate.mutateAsync({
        disputeId: dispute.id,
        input: { agreed_outcome: 'Mediated resolution' },
      });

      if (result.pending_confirmation) {
        setActionImpactSummary({
          tone: 'neutral',
          lines: [t('impact.mediationPendingLine'), t('impact.noNetXpLine')],
        });
      } else {
        setActionImpactSummary({
          tone: 'positive',
          lines: [
            t('impact.disputantRefundLine', { xp: dispute.xp_stake.toLocaleString() }),
            t('impact.questHintLine'),
          ],
        });
      }

      await runProgressionFeedback();
      onRefresh();
    } catch {
      // Error handled by mutation
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw.mutateAsync(dispute.id);
      const refundedXp = Math.max(0, dispute.xp_stake - withdrawalFeeXp);
      setActionImpactSummary({
        tone: 'neutral',
        lines: [
          t('impact.withdrawalFeeLine', { xp: Math.min(withdrawalFeeXp, dispute.xp_stake) }),
          t('impact.withdrawRefundLine', { xp: refundedXp.toLocaleString() }),
        ],
      });

      await runProgressionFeedback();
      onRefresh();
    } catch {
      // Error handled by mutation
    }
  };

  const reviewerPenaltyXp = disputeConfig?.xp_dispute_reviewer_penalty ?? 30;
  const arbitratorRewardXp = disputeConfig?.xp_dispute_arbitrator_reward ?? 25;

  return (
    <div data-testid="dispute-detail-surface" className="space-y-6">
      <DisputeHeader dispute={dispute} responseSlaUrgency={responseSlaUrgency} />

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

          <DisputeParticipants dispute={dispute} />

          <DisputeEvidenceSection
            dispute={dispute}
            canUploadEvidence={canUploadEvidence}
            onRefresh={onRefresh}
          />

          <DisputeResponseSection dispute={dispute} />

          {dispute.submission && <DisputeOriginalReview submission={dispute.submission} />}

          {dispute.resolution_notes && (
            <DisputeResolutionNotes
              resolutionNotes={dispute.resolution_notes}
              newQualityScore={dispute.new_quality_score}
            />
          )}

          {canRespond && <RespondPanel disputeId={dispute.id} onSuccess={onRefresh} />}
          {canResolve && (
            <ResolvePanel
              disputeId={dispute.id}
              basePoints={dispute.task?.base_points ?? 0}
              xpStake={dispute.xp_stake}
              reviewerPenaltyXp={reviewerPenaltyXp}
              arbitratorRewardXp={arbitratorRewardXp}
              hasArbitrator={Boolean(dispute.arbitrator_id)}
              onImpact={setActionImpactSummary}
              onPostAction={runProgressionFeedback}
              onSuccess={onRefresh}
            />
          )}

          <DisputeActions
            canAssign={canAssign}
            canMediate={canMediate}
            canWithdraw={canWithdraw}
            canAppeal={canAppeal}
            onAssign={() => assignArbitrator.mutate(dispute.id, { onSuccess: onRefresh })}
            onMediate={handleMediate}
            onWithdraw={handleWithdraw}
            onAppeal={() =>
              appeal.mutate(
                { disputeId: dispute.id, input: { appeal_reason: 'Appealing council ruling' } },
                { onSuccess: onRefresh }
              )
            }
            isAssigning={assignArbitrator.isPending}
            isMediating={mediate.isPending}
            isWithdrawing={withdraw.isPending}
            isAppealing={appeal.isPending}
          />

          {actionImpactSummary && <DisputeImpactSummary summary={actionImpactSummary} />}
        </div>

        <DisputeIntegrityRail
          dispute={dispute}
          responsePostureLabel={responsePostureLabel}
          disputeWindowLabel={disputeWindowLabel}
          evidenceFileUrlsCount={evidenceFileUrls.length}
          evidenceEventsCount={evidenceEvents.length}
          lateEvidenceCount={lateEvidenceCount}
          escalationPosture={escalationPosture}
        />
      </div>
    </div>
  );
}
