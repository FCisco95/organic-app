'use client';

import { useTranslations } from 'next-intl';
import type { QuestProgressItem } from '@/features/gamification/types';
import { Badge } from '@/components/ui/badge';

const QUEST_CTA_MAP: Record<string, string> = {
  daily_tasks_completed: '/tasks',
  daily_votes_cast: '/proposals',
  daily_xp_earned: '/tasks',
  weekly_tasks_completed: '/tasks',
  weekly_governance_actions: '/proposals',
  weekly_active_days: '/tasks',
  long_term_level: '/quests',
  long_term_achievements: '/profile/progression',
  long_term_streak: '/tasks',
};

interface QuestCardProps {
  quest: QuestProgressItem;
}

export function QuestCard({ quest }: QuestCardProps) {
  const t = useTranslations('Quests');

  const isCompleted = quest.completed;
  const barColor = isCompleted ? 'bg-emerald-500' : 'bg-organic-orange';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-sm">
      {/* Header row: Icon + Title + XP Badge */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-xl shrink-0" role="img" aria-hidden="true">
          {quest.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{quest.title}</h3>
            {quest.xp_reward > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-[10px] font-semibold px-1.5 py-0.5">
                +{quest.xp_reward} XP
              </Badge>
            )}
            {quest.points_reward > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5">
                +{quest.points_reward} pts
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{quest.description}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${quest.progress_percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-xs text-gray-500 tabular-nums">
            {quest.progress} / {quest.target}
          </span>
          {isCompleted ? (
            <span className="text-xs font-medium text-emerald-600">{t('completed')}</span>
          ) : quest.reset_at ? (
            <span className="text-xs text-gray-400">
              {t('resetsLabel')}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
