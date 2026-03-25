'use client';

import { useTranslations } from 'next-intl';
import { Target, Vote, Zap, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import type { QuestProgressItem, QuestCadence } from '@/features/gamification/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/chart-colors';
import { QuestProgressRing } from './quest-progress-ring';
import { Link } from '@/i18n/navigation';

const QUEST_CTA_MAP: Record<string, { href: string; label: string }> = {
  daily_tasks_completed: { href: '/tasks', label: 'Go to Tasks' },
  daily_votes_cast: { href: '/proposals', label: 'Go to Proposals' },
  daily_xp_earned: { href: '/tasks', label: 'Earn XP' },
  weekly_tasks_completed: { href: '/tasks', label: 'Go to Tasks' },
  weekly_governance_actions: { href: '/proposals', label: 'Go to Proposals' },
  weekly_active_days: { href: '/tasks', label: 'Stay Active' },
  long_term_level: { href: '/earn?tab=quests', label: 'Level Up' },
  long_term_achievements: { href: '/profile/progression', label: 'View Achievements' },
  long_term_streak: { href: '/tasks', label: 'Keep Streak' },
};

/** Semantic cadence colors — Tailwind palette hex for SVG ring strokes */
const CADENCE_COLORS: Record<QuestCadence, { ring: string; badge: string; icon: string }> = {
  daily: { ring: '#60a5fa', badge: 'bg-blue-500/15 text-blue-400', icon: 'text-blue-400' },
  weekly: { ring: '#a78bfa', badge: 'bg-purple-500/15 text-purple-400', icon: 'text-purple-400' },
  long_term: { ring: '#fbbf24', badge: 'bg-amber-500/15 text-amber-400', icon: 'text-amber-400' },
  event: { ring: '#34d399', badge: 'bg-emerald-500/15 text-emerald-400', icon: 'text-emerald-400' },
};

function getCadenceIcon(questId: string, cadence: QuestCadence) {
  if (questId.includes('vote') || questId.includes('governance')) return Vote;
  if (questId.includes('xp')) return Zap;
  if (questId.includes('streak') || questId.includes('active_days')) return Calendar;
  return Target;
}

interface QuestCardProps {
  quest: QuestProgressItem;
}

export function QuestCard({ quest }: QuestCardProps) {
  const t = useTranslations('Quests');

  const isCompleted = quest.completed;
  const cadence = quest.cadence;
  const colors = CADENCE_COLORS[cadence];
  const Icon = getCadenceIcon(quest.id, cadence);
  const cta = QUEST_CTA_MAP[quest.id];

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border p-4 transition-all hover:shadow-sm relative',
        isCompleted && 'opacity-80'
      )}
    >
      {/* Completed overlay */}
      {isCompleted && (
        <div className="absolute top-3 right-3 animate-pulse">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Progress ring with icon */}
        <div className="shrink-0">
          <QuestProgressRing
            percent={quest.progress_percent}
            size={48}
            strokeWidth={4}
            color={isCompleted ? CHART_COLORS.emerald : colors.ring}
          >
            <Icon className={cn('h-5 w-5', isCompleted ? 'text-emerald-500' : colors.icon)} />
          </QuestProgressRing>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground truncate">{quest.title}</h3>
            {quest.xp_reward > 0 && (
              <Badge className={cn('text-[10px] font-semibold px-1.5 py-0.5', colors.badge)}>
                +{quest.xp_reward} XP
              </Badge>
            )}
            {quest.points_reward > 0 && (
              <Badge className={cn('text-[10px] font-semibold px-1.5 py-0.5', colors.badge)}>
                +{quest.points_reward} pts
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{quest.description}</p>

          {/* Progress text */}
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {quest.progress} / {quest.target}
            </span>
            {isCompleted ? (
              <span className="text-xs font-medium text-emerald-500">{t('completed')}</span>
            ) : quest.reset_at ? (
              <span className="text-xs text-muted-foreground">
                {t('resetsLabel')}
              </span>
            ) : null}
          </div>

          {/* CTA link */}
          {cta && !isCompleted && (
            <Link
              href={cta.href}
              className={cn(
                'inline-flex items-center gap-1 mt-2 text-xs font-medium transition-colors hover:underline',
                colors.icon
              )}
            >
              {cta.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
