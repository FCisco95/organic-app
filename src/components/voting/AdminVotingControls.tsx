'use client';

import { useState } from 'react';
import { Play, Square, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
  ProposalWithVoting,
  getVotingStatus,
  useStartVoting,
  useFinalizeVoting,
  useVotingConfig,
} from '@/features/voting';

interface AdminVotingControlsProps {
  proposal: ProposalWithVoting;
  onVotingStarted?: () => void;
  onVotingFinalized?: () => void;
}

export function AdminVotingControls({
  proposal,
  onVotingStarted,
  onVotingFinalized,
}: AdminVotingControlsProps) {
  const t = useTranslations('Voting');
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const { data: config } = useVotingConfig();
  const startVotingMutation = useStartVoting();
  const finalizeVotingMutation = useFinalizeVoting();

  const status = getVotingStatus(proposal);
  const isFinalizationFrozen = Boolean(proposal.finalization_frozen_at);

  const handleStartVoting = async () => {
    try {
      await startVotingMutation.mutateAsync({
        proposalId: proposal.id,
        input: { voting_duration_days: config?.voting_duration_days },
      });

      toast.success(t('toast.votingStarted'));
      onVotingStarted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.startFailed'));
    }
  };

  const handleFinalizeVoting = async (force = false) => {
    try {
      await finalizeVotingMutation.mutateAsync({
        proposalId: proposal.id,
        input: { force },
      });

      toast.success(t('toast.votingFinalized'));
      setShowFinalizeConfirm(false);
      onVotingFinalized?.();
    } catch (error) {
      const apiError = error as Error & { code?: string };
      if (apiError.code === 'FINALIZATION_FROZEN') {
        onVotingFinalized?.();
      }
      toast.error(error instanceof Error ? error.message : t('toast.finalizeFailed'));
    }
  };

  // Show start voting button for pre-voting lifecycle statuses.
  if (['public', 'qualified', 'discussion', 'submitted'].includes(proposal.status)) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('admin.startDescription')}</p>
        <button
          onClick={handleStartVoting}
          disabled={startVotingMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {startVotingMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {startVotingMutation.isPending ? t('admin.starting') : t('admin.startVoting')}
        </button>
        {config && (
          <p className="text-xs text-gray-500">
            {t('admin.votingDuration', { days: config.voting_duration_days })}
          </p>
        )}
      </div>
    );
  }

  // Show finalize button for voting proposals
  if (status === 'voting_open' || status === 'voting_closed') {
    const canFinalize = status === 'voting_closed';

    if (isFinalizationFrozen) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">
              {t('admin.finalizationFrozen', {
                attempts: proposal.finalization_attempts ?? 0,
              })}
            </p>
          </div>
          <p className="text-xs text-gray-500">{t('admin.finalizationFrozenHelp')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {!canFinalize && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-700">{t('admin.votingStillOpen')}</p>
          </div>
        )}

        <button
          onClick={() => setShowFinalizeConfirm(true)}
          disabled={finalizeVotingMutation.isPending}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50
            ${
              canFinalize
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }
          `}
        >
          {finalizeVotingMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {finalizeVotingMutation.isPending ? t('admin.finalizing') : t('admin.finalizeVoting')}
        </button>

        {/* Finalize Confirmation Modal */}
        {showFinalizeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('admin.finalizeTitle')}</h3>
              <p className="text-gray-600 mb-4">
                {canFinalize ? t('admin.finalizeDescription') : t('admin.finalizeEarlyWarning')}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleFinalizeVoting(!canFinalize)}
                  disabled={finalizeVotingMutation.isPending}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {finalizeVotingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : null}
                  {t('admin.confirmFinalize')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
