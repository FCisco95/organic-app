'use client';

import { useEffect, useState } from 'react';

interface SprintCountdownProps {
  targetIso: string | null;
  className?: string;
}

function formatCountdown(targetIso: string | null): string {
  if (!targetIso) return '—';
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return '—';
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return '—';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes / 60) % 24);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SprintCountdown({ targetIso, className }: SprintCountdownProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    setText(formatCountdown(targetIso));
    const id = setInterval(() => setText(formatCountdown(targetIso)), 60_000);
    return () => clearInterval(id);
  }, [targetIso]);

  return <span className={className}>{text || '—'}</span>;
}
