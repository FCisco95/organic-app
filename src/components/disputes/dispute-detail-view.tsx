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
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Shield, MessageSquare, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type DetailTab = 'overview' | 'evidence' | 'resolution' | 'discussion';

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'recently';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'recently';
  return formatDistanceToNow(date, { addSuffix: true });
}

interface DisputeDetailProps {
  dispute: DisputeWithRelations;
  currentUserId: string;
  currentUserRole: string;
  onRefresh: () => void;
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    user?: {
      name?: string | null;
      email?: string;
      organic_id?: number | null;
      avatar_url?: string | null;
    } | null;
  }>;
  commentText?: string;
  onCommentTextChange?: (value: string) => void;
  onAddComment?: () => void;
  isAddingComment?: boolean;
  isParty?: boolean;
}

export function DisputeDetail({
  dispute,
  currentUserId,
  currentUserRole,
  onRefresh,
  comments = [],
  commentText = '',
  onCommentTextChange,
  onAddComment,
  isAddingComment = false,
  isParty = false,
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

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

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

  const TABS: { key: DetailTab; labelKey: string; icon: React.ElementType }[] = [
    { key: 'overview', labelKey: 'tabs.overview', icon: Eye },
    { key: 'evidence', labelKey: 'tabs.evidence', icon: FileText },
    { key: 'resolution', labelKey: 'tabs.resolution', icon: Shield },
    { key: 'discussion', labelKey: 'tabs.discussion', icon: MessageSquare },
  ];

  return (
    <div data-testid="dispute-detail-surface" className="space-y-0">
      {/* Header — always visible */}
      <DisputeHeader dispute={dispute} responseSlaUrgency={responseSlaUrgency} />

      {/* Tab navigation — sticky */}
      <div className="sticky top-0 z-10 -mx-px mt-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <nav className="flex gap-0" data-testid="dispute-detail-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                data-testid={`dispute-tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-orange-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content area: tabs + sidebar */}
      <div
        data-testid="dispute-detail-operator-grid"
        className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        {/* Tab content */}
        <div className="min-w-0 space-y-4">
          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <>
              {/* Mobile-only metadata panel */}
              <div className="lg:hidden">
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

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <DisputeTimeline
                  status={dispute.status}
                  tier={dispute.tier}
                  responseDeadline={dispute.response_deadline}
                  disputeWindowEndsAt={dispute.sprint?.dispute_window_ends_at ?? null}
                  lateEvidenceCount={lateEvidenceCount}
                />
              </div>

              <DisputeParticipants dispute={dispute} isParty={isDisputant || isReviewer || isArbitrator || isAdmin || isCouncil} />
              <DisputeResponseSection dispute={dispute} />
              {dispute.submission && <DisputeOriginalReview submission={dispute.submission} />}
            </>
          )}

          {/* ===== EVIDENCE TAB ===== */}
          {activeTab === 'evidence' && (
            <DisputeEvidenceSection
              dispute={dispute}
              canUploadEvidence={canUploadEvidence}
              onRefresh={onRefresh}
            />
          )}

          {/* ===== RESOLUTION TAB ===== */}
          {activeTab === 'resolution' && (
            <>
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

              {!dispute.resolution_notes && !canResolve && !canRespond && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">{t('tabs.noResolutionYet')}</p>
                </div>
              )}
            </>
          )}

          {/* ===== DISCUSSION TAB ===== */}
          {activeTab === 'discussion' && (
            <div data-testid="dispute-comments-panel" className="space-y-4">
              {!isParty ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">{t('tabs.discussionPartyOnly')}</p>
                </div>
              ) : (
                <>
                  {/* Comments list — conversation style */}
                  {comments.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">{td('noCommentsYet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          data-testid={`dispute-comment-${comment.id}`}
                          className="rounded-lg border border-gray-200 bg-white"
                        >
                          {/* Comment header */}
                          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-3 py-2">
                            <Avatar className="h-5 w-5 shrink-0">
                              {comment.user?.avatar_url && (
                                <AvatarImage src={comment.user.avatar_url} />
                              )}
                              <AvatarFallback className="bg-gray-200 text-[9px]">
                                {(comment.user?.name || comment.user?.email || '?')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-gray-900">
                              {comment.user?.name ||
                                (comment.user?.organic_id
                                  ? `ORG-${comment.user.organic_id}`
                                  : comment.user?.email?.split('@')[0])}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {t('tabs.commentedAgo', { time: formatRelativeTime(comment.created_at) })}
                            </span>
                          </div>
                          {/* Comment body */}
                          <div className="px-3 py-2.5">
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment — GitHub-style */}
                  <div className="rounded-lg border border-gray-200 bg-white p-3" data-testid="dispute-comment-input-row">
                    <textarea
                      value={commentText}
                      onChange={(e) => onCommentTextChange?.(e.target.value)}
                      placeholder={td('addComment')}
                      rows={3}
                      className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          onAddComment?.();
                        }
                      }}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        onClick={onAddComment}
                        disabled={!commentText.trim() || isAddingComment}
                        size="sm"
                        className="bg-orange-600 text-white hover:bg-orange-700"
                      >
                        {isAddingComment ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {td('addComment')}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Metadata sidebar — desktop only */}
        <div className="hidden lg:block">
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
    </div>
  );
}
