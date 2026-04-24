'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getStreakColor } from '@/features/reputation';
import { useMarkStreakToday, AlreadyDoneTodayError } from '@/features/daily-tasks/hooks';

interface StreakDisplayProps {
  streak: number;
  showLabel?: boolean;
  className?: string;
  /**
   * When true, the flame becomes a pressable button that claims today's
   * streak. Only pass this for the current user's own streak.
   */
  interactive?: boolean;
  /**
   * YYYY-MM-DD of the last claimed day, in the user's local timezone. Used
   * to decide whether the button is already "done" for today.
   */
  lastLoginDate?: string | null;
}

function localDateToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function nextLocalMidnight(): Date {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

export function StreakDisplay({
  streak,
  showLabel = true,
  className,
  interactive = false,
  lastLoginDate = null,
}: StreakDisplayProps) {
  const t = useTranslations('Reputation');
  const mutation = useMarkStreakToday();

  const [displayStreak, setDisplayStreak] = useState(streak);
  const [popping, setPopping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayStreak(streak);
  }, [streak]);

  const claimedToday = useMemo(() => {
    if (!interactive) return false;
    if (!lastLoginDate) return false;
    return lastLoginDate === localDateToday();
  }, [interactive, lastLoginDate]);

  // Tick every 30s while counting down so the label stays fresh.
  useEffect(() => {
    if (!interactive || !claimedToday) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [interactive, claimedToday]);

  useEffect(() => {
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    };
  }, []);

  const color = getStreakColor(displayStreak);

  const triggerPop = () => {
    setPopping(true);
    if (popTimer.current) clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopping(false), 700);
  };

  const onPress = async () => {
    if (!interactive || claimedToday || mutation.isPending) return;
    setErrorMsg(null);
    // Optimistic pop; snap back if the server rejects.
    const optimistic = displayStreak + 1;
    setDisplayStreak(optimistic);
    triggerPop();
    try {
      const result = await mutation.mutateAsync();
      setDisplayStreak(result.data.current_streak);
    } catch (err) {
      setDisplayStreak(streak);
      if (err instanceof AlreadyDoneTodayError) {
        setErrorMsg(t('streakAlreadyClaimed'));
      } else {
        setErrorMsg(t('streakClaimError'));
      }
    }
  };

  const countdown = claimedToday
    ? formatCountdown(nextLocalMidnight().getTime() - now)
    : null;

  const label = (() => {
    if (!showLabel) return null;
    if (interactive) {
      if (claimedToday && countdown) {
        return (
          <span className="text-xs text-muted-foreground">
            {t('markDoneToday')} · {t('nextStreakIn', { time: countdown })}
          </span>
        );
      }
      return (
        <span className="text-xs text-muted-foreground">
          {t('markDoneTodayCta')}
        </span>
      );
    }
    return (
      <span className="text-xs text-gray-400">
        {displayStreak > 0 ? t('daysStreak', { count: displayStreak }) : t('noStreak')}
      </span>
    );
  })();

  if (!interactive) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <Flame className={cn('w-4 h-4', color)} />
        <span className={cn('text-sm font-medium', color)}>{displayStreak}</span>
        {label}
      </span>
    );
  }

  const pressable = !claimedToday && !mutation.isPending;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={onPress}
        disabled={!pressable}
        aria-label={
          claimedToday
            ? t('markDoneToday')
            : t('markDoneTodayCta')
        }
        aria-pressed={claimedToday}
        data-testid="streak-button"
        className={cn(
          'group relative inline-flex items-center justify-center rounded-full p-1.5 transition-transform',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          pressable && 'cursor-pointer hover:scale-110 active:scale-95',
          !pressable && 'cursor-default opacity-90'
        )}
      >
        <Flame
          className={cn(
            'w-5 h-5 transition-colors',
            color,
            popping && 'animate-streak-pop',
            !popping && pressable && 'animate-streak-flicker',
            !popping && claimedToday && 'drop-shadow-[0_0_6px_rgba(251,146,60,0.55)]'
          )}
          aria-hidden
        />
      </button>
      <span
        key={displayStreak}
        className={cn(
          'text-sm font-bold tabular-nums',
          color,
          popping && 'animate-streak-count'
        )}
      >
        {displayStreak}
      </span>
      {errorMsg ? (
        <span className="text-xs text-destructive" role="status">
          {errorMsg}
        </span>
      ) : (
        label
      )}
    </span>
  );
}
