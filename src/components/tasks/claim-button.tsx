'use client';

import { useState } from 'react';
import { Hand, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClaimTask, useUnclaimTask, TaskWithRelations, canClaimTask } from '@/features/tasks';
import { useAuth } from '@/features/auth/context';
import toast from 'react-hot-toast';

interface ClaimButtonProps {
  task: TaskWithRelations;
  onSuccess?: () => void;
  className?: string;
}

export function ClaimButton({ task, onSuccess, className }: ClaimButtonProps) {
  const { user, profile } = useAuth();
  const claimTask = useClaimTask();
  const unclaimTask = useUnclaimTask();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !profile) {
    return null;
  }

  const userId = user.id;
  const userHasOrganicId = !!profile.organic_id;

  // Check if user is already assigned
  const isAssigned = task.is_team_task
    ? task.assignees?.some((a) => a.user_id === userId)
    : task.assignee_id === userId;

  // Check if task can be claimed
  const { canClaim, reason } = canClaimTask(task, userId, userHasOrganicId);

  const handleClaim = async () => {
    if (!canClaim) {
      if (reason) toast.error(reason);
      return;
    }

    setIsLoading(true);
    try {
      await claimTask.mutateAsync(task.id);
      toast.success('Task claimed successfully!');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to claim task');
      console.error('Claim error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnclaim = async () => {
    setIsLoading(true);
    try {
      await unclaimTask.mutateAsync(task.id);
      toast.success('Task unclaimed');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to unclaim task');
      console.error('Unclaim error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is assigned, show unclaim button
  if (isAssigned) {
    return (
      <button
        onClick={handleUnclaim}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
          'border border-red-300 text-red-600 hover:bg-red-50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        Unclaim Task
      </button>
    );
  }

  // Show claim button (disabled if can't claim)
  return (
    <button
      onClick={handleClaim}
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
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hand className="w-4 h-4" />}
      Claim Task
    </button>
  );
}

interface TeamClaimStatusProps {
  task: TaskWithRelations;
  className?: string;
}

export function TeamClaimStatus({ task, className }: TeamClaimStatusProps) {
  if (!task.is_team_task) return null;

  const currentAssignees = task.assignees?.length ?? 0;
  const maxAssignees = task.max_assignees ?? 1;
  const percentage = (currentAssignees / maxAssignees) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Team Progress</span>
        <span className="font-medium text-gray-900">
          {currentAssignees} / {maxAssignees} members
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-organic-orange transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
