'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IdeaDetail } from '@/features/ideas';

interface TimelineEvent {
  icon: React.ReactNode;
  label: string;
  timestamp?: string;
  isComplete: boolean;
}

interface IdeaTimelineProps {
  idea: IdeaDetail;
}

export function IdeaTimeline({ idea }: IdeaTimelineProps) {
  const t = useTranslations('IdeaDetail');

  const authorName = idea.author?.organic_id
    ? `Organic #${idea.author.organic_id}`
    : idea.author?.name ?? idea.author?.email ?? t('unknownAuthor');

  const events: TimelineEvent[] = [
    {
      icon: <Lightbulb className="h-4 w-4" />,
      label: t('timelineCreated', { author: authorName }),
      timestamp: idea.created_at,
      isComplete: true,
    },
    {
      icon: <ThumbsUp className="h-4 w-4" />,
      label: t('timelineVotes', { count: (idea.upvotes ?? 0) + (idea.downvotes ?? 0) }),
      isComplete: (idea.upvotes ?? 0) + (idea.downvotes ?? 0) > 0,
    },
    {
      icon: <MessageCircle className="h-4 w-4" />,
      label: t('timelineComments', { count: idea.comments_count ?? 0 }),
      isComplete: (idea.comments_count ?? 0) > 0,
    },
  ];

  if (idea.promoted_to_proposal_id) {
    events.push({
      icon: <TrendingUp className="h-4 w-4" />,
      label: t('timelinePromoted'),
      timestamp: idea.promoted_at ?? undefined,
      isComplete: true,
    });
  } else {
    events.push({
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: t('timelinePending'),
      isComplete: false,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('timelineTitle')}
      </h3>
      <div className="relative">
        {events.map((event, index) => (
          <div key={index} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Vertical line */}
            {index < events.length - 1 && (
              <div className="absolute left-[11px] top-6 h-full w-px border-l-2 border-border" />
            )}
            {/* Dot */}
            <div
              className={cn(
                'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                event.isComplete
                  ? 'bg-cta text-cta-fg'
                  : 'border-2 border-border bg-card text-muted-foreground'
              )}
            >
              {event.icon}
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm',
                  event.isComplete ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {event.label}
              </p>
              {event.timestamp && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
