'use client';

import { useAuth } from '@/features/auth/context';
import { useGamificationOverview } from '@/features/gamification/hooks';
import { Flame } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface SidebarWidgetProps {
  collapsed?: boolean;
}

export function SidebarWidget({ collapsed = false }: SidebarWidgetProps) {
  const { user } = useAuth();
  const { data } = useGamificationOverview({ enabled: !!user });

  if (!user || !data) return null;

  const streak = data.current_streak ?? 0;
  const lp = data.level_progress;
  const progress = lp.progress_percent;

  if (collapsed) {
    return (
      <Link href="/earn" className="flex flex-col items-center gap-1 py-2 px-1">
        {streak > 0 && (
          <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#E8845C]">
            <Flame className="h-3 w-3" />
            {streak}
          </div>
        )}
        <div className="w-8 h-1 rounded-full bg-sidebar-border overflow-hidden">
          <div
            className="h-full rounded-full bg-cta transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/earn"
      className="mx-3 my-2 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
    >
      {streak > 0 && (
        <div className="flex items-center gap-1 text-xs font-bold text-[#E8845C] shrink-0">
          <Flame className="h-3.5 w-3.5" />
          <span>{streak}d</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] text-sidebar-muted-foreground mb-0.5">
          <span className="font-medium">Lv {lp.level}</span>
          <span>{data.xp_total.toLocaleString()} XP</span>
        </div>
        <div className="h-1 rounded-full bg-sidebar-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-organic-terracotta to-yellow-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
