'use client';

import { useTranslations } from 'next-intl';
import { Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsFollowing, useFollow, useUnfollow } from '@/features/notifications/hooks';
import type { FollowSubjectType } from '@/features/notifications/types';

interface FollowButtonProps {
  subjectType: FollowSubjectType;
  subjectId: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function FollowButton({
  subjectType,
  subjectId,
  className,
  variant = 'outline',
  size = 'sm',
}: FollowButtonProps) {
  const t = useTranslations('Notifications');
  const { data: isFollowing, isLoading } = useIsFollowing(subjectType, subjectId);
  const follow = useFollow();
  const unfollow = useUnfollow();

  const isPending = follow.isPending || unfollow.isPending;

  const handleToggle = () => {
    const payload = { subject_type: subjectType, subject_id: subjectId };
    if (isFollowing) {
      unfollow.mutate(payload);
    } else {
      follow.mutate(payload);
    }
  };

  // Loading state: skeleton placeholder matching button size
  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          'rounded-md',
          size === 'sm' ? 'h-8 w-24' : size === 'icon' ? 'h-8 w-8' : 'h-9 w-28',
          className
        )}
      />
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'gap-1.5 transition-all duration-200',
        isFollowing && 'text-foreground border-border',
        className
      )}
    >
      {isFollowing ? (
        <>
          <BellOff className="h-3.5 w-3.5" />
          {size !== 'icon' && <span>{t('following')}</span>}
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5" />
          {size !== 'icon' && <span>{t('follow')}</span>}
        </>
      )}
    </Button>
  );
}
