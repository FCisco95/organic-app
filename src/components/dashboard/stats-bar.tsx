'use client';

import { useRef, useState, useEffect } from 'react';
import { useStats } from '@/features/activity';
import { useTranslations } from 'next-intl';

function CountUp({ target }: { target: number | string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof target !== 'number') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let current = 0;
          const increment = target / 40;
          timerRef.current = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              if (timerRef.current) clearInterval(timerRef.current);
            }
            setValue(Math.floor(current));
          }, 30);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [target]);

  if (typeof target !== 'number') {
    return (
      <span className="text-3xl font-black font-mono bg-gradient-to-r from-[var(--orange)] to-[var(--yellow)] bg-clip-text text-transparent block mb-1">
        {target}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className="text-3xl font-black font-mono bg-gradient-to-r from-[var(--orange)] to-[var(--yellow)] bg-clip-text text-transparent block mb-1"
    >
      {value}
    </span>
  );
}

export function StatsBar() {
  const { data: stats, isLoading } = useStats();
  const t = useTranslations('dashboard.stats');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] rounded-[14px] p-5 text-center">
            <div className="h-9 bg-muted rounded w-16 mx-auto mb-2 animate-pulse" />
            <div className="h-3 bg-muted/60 rounded w-20 mx-auto animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { value: stats?.total_users ?? '—', label: t('totalUsers') },
    { value: stats?.org_holders ?? '—', label: t('orgHolders') },
    { value: stats?.active_proposals ?? '—', label: t('activeProposals') },
    { value: stats?.tasks_completed ?? '—', label: t('tasksCompleted') },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="card-hover border border-[hsl(var(--border))] bg-[var(--surface)] rounded-[14px] p-5 text-center"
        >
          <CountUp target={item.value} />
          <span className="text-xs text-[var(--text-dim)] font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
