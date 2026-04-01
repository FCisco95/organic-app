'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { Zap, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProposalListItem } from '@/features/proposals/types';

interface LiveVoteBannerProps {
  proposals: ProposalListItem[];
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useCountdown(targetDate: Date | null): TimeLeft | null {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    function calc(): TimeLeft | null {
      const diff = targetDate!.getTime() - Date.now();
      if (diff <= 0) return null;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { days, hours, minutes, seconds };
    }

    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl font-black text-white tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-organic-terracotta-light">{label}</span>
    </div>
  );
}

function Separator() {
  return <span className="self-start pt-1 text-xl font-bold text-[#E8845C]">:</span>;
}

export function LiveVoteBanner({ proposals }: LiveVoteBannerProps) {
  const t = useTranslations('Proposals');

  const votingProposals = proposals
    .filter((p) => p.status === 'voting')
    .sort((a, b) => {
      if (!a.voting_ends_at) return 1;
      if (!b.voting_ends_at) return -1;
      return new Date(a.voting_ends_at).getTime() - new Date(b.voting_ends_at).getTime();
    });

  const primary = votingProposals[0] ?? null;
  const endsAt = primary?.voting_ends_at ? new Date(primary.voting_ends_at) : null;
  const timeLeft = useCountdown(endsAt);
  const isExpired = endsAt !== null && timeLeft === null;

  if (!primary) return null;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${isExpired ? 'from-slate-600 via-slate-500 to-slate-400' : 'from-organic-terracotta via-organic-terracotta to-amber-500'} p-5 shadow-lg mb-4`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {!isExpired && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${isExpired ? 'text-slate-200' : 'text-organic-terracotta-light'}`}>
              <Zap className="h-3 w-3" />
              {isExpired ? t('awaitingFinalization') : t('liveVoting')}
              {votingProposals.length > 1 && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  +{votingProposals.length - 1}
                </span>
              )}
            </span>
          </div>
          <h3 className="text-base font-bold text-white line-clamp-1 sm:text-lg">
            {primary.title}
          </h3>
          {primary.summary && (
            <p className={`mt-1 line-clamp-1 text-xs ${isExpired ? 'text-slate-300' : 'text-organic-terracotta-light'}`}>{primary.summary}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-start gap-3 sm:items-end">
          <VoteCountdown endsAt={endsAt} timeLeft={timeLeft} t={t} />
          <Link
            href={`/proposals/${primary.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-colors ${isExpired ? 'bg-white/90 text-slate-700 hover:bg-white' : 'bg-white text-organic-terracotta hover:bg-organic-terracotta-lightest'}`}
          >
            {isExpired ? t('viewResults') : t('castYourVote')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function VoteCountdown({ endsAt, timeLeft, t }: { endsAt: Date | null; timeLeft: TimeLeft | null; t: ReturnType<typeof useTranslations<'Proposals'>> }) {
  if (!endsAt) {
    return (
      <p className="text-xs font-semibold text-organic-terracotta-light">{t('votingOpen')}</p>
    );
  }

  if (!timeLeft) {
    return (
      <p className="text-xs font-semibold text-slate-200">{t('votingClosed')}</p>
    );
  }

  if (timeLeft.days > 0) {
    return (
      <div className="flex items-center gap-1.5">
        <CountdownUnit value={timeLeft.days} label="days" />
        <Separator />
        <CountdownUnit value={timeLeft.hours} label="hrs" />
        <Separator />
        <CountdownUnit value={timeLeft.minutes} label="min" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <CountdownUnit value={timeLeft.hours} label="hrs" />
      <Separator />
      <CountdownUnit value={timeLeft.minutes} label="min" />
      <Separator />
      <CountdownUnit value={timeLeft.seconds} label="sec" />
    </div>
  );
}
