'use client';

import { useState } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClaimTask, useUnclaimTask, TaskWithRelations, canClaimTask } from '@/features/tasks';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface ClaimButtonProps {
  task: TaskWithRelations;
  onSuccess?: () => void;
  className?: string;
}

export function ClaimButton({ task, onSuccess, className }: ClaimButtonProps) {
  const { user, profile } = useAuth();
  const t = useTranslations('Tasks');
  const claimTask = useClaimTask();
  const unclaimTask = useUnclaimTask();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !profile) {
    return null;
  }

  const userId = user.id;
  const userHasOrganicId = !!profile.organic_id;

  // Check if user is a participant (always via task_assignees)
  const isParticipant = task.assignees?.some((a) => a.user_id === userId) ?? false;

  // Check if task can be joined
  const { canClaim, reason } = canClaimTask(task, userId, userHasOrganicId);

  const handleJoin = async () => {
    if (!canClaim) {
      if (reason) toast.error(reason);
      return;
    }

    setIsLoading(true);
    try {
      await claimTask.mutateAsync(task.id);
      toast.success(t('joinSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(t('joinFailed'));
      console.error('Join error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await unclaimTask.mutateAsync(task.id);
      toast.success(t('leaveSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(t('leaveFailed'));
      console.error('Leave error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show "Leave Task" if user is a participant
  if (isParticipant) {
    return (
      <button
        onClick={handleLeave}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
          'border border-red-300 text-red-600 hover:bg-red-50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserMinus className="w-4 h-4" />
        )}
        {t('leaveTask')}
      </button>
    );
  }

  // Show disabled state for non-members
  if (!userHasOrganicId) {
    return (
      <button
        disabled
        title={t('joinRequiresOrganicId')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
          'bg-gray-100 text-gray-400 cursor-not-allowed',
          className
        )}
      >
        <UserPlus className="w-4 h-4" />
        {t('joinTask')}
      </button>
    );
  }

  // Show "Join Task" button
  return (
    <button
      onClick={handleJoin}
      disabled={isLoading || !canClaim}
      title={reason}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
        canClaim
          ? 'bg-organic-orange hover:bg-orange-600 text-white'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed',
        'disabled:opacity-50',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {t('joinTask')}
    </button>
  );
}

interface ParticipantCountProps {
  task: TaskWithRelations;
  className?: string;
}

export function ParticipantCount({ task, className }: ParticipantCountProps) {
  const t = useTranslations('Tasks');
  const count = task.assignees?.length ?? 0;

  if (count === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
      <span>{t('participantCount', { count })}</span>
    </div>
  );
}

// Keep TeamClaimStatus for backward compat but redirect to ParticipantCount
export function TeamClaimStatus({ task, className }: ParticipantCountProps) {
  return <ParticipantCount task={task} className={className} />;
}
