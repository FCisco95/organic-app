'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUp, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IdeaListItem } from '@/features/ideas';

interface IdeaFeedCardProps {
  idea: IdeaListItem;
  onVote: (ideaId: string, next: 'up' | 'none') => void;
  isSpotlight?: boolean;
  style?: React.CSSProperties;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'promoted':
      return 'bg-organic-terracotta-lightest text-organic-terracotta border-organic-terracotta-light';
    case 'archived':
      return 'bg-muted text-muted-foreground border-border';
    case 'removed':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export function IdeaFeedCard({ idea, onVote, isSpotlight, style }: IdeaFeedCardProps) {
  const t = useTranslations('Ideas');
  const vote = idea.user_vote;
  const authorName = idea.author?.organic_id
    ? `Organic #${idea.author.organic_id}`
    : idea.author?.name ?? idea.author?.email ?? t('unknownAuthor');

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-md',
        isSpotlight && 'border-l-4 border-l-organic-terracotta'
      )}
      style={style}
    >
      {/* Status badge + spotlight badge */}
      <div className="mb-3 flex items-center gap-2">
        <Badge
          className={cn(
            'border text-[10px] uppercase tracking-wider',
            getStatusColor(idea.status)
          )}
        >
          {idea.status}
        </Badge>
        {isSpotlight && (
          <Badge className="border border-organic-terracotta-light bg-organic-terracotta-lightest text-[10px] uppercase tracking-wider text-organic-terracotta">
            {t('spotlightLabel')}
          </Badge>
        )}
        {idea.is_pinned && (
          <Badge className="border border-amber-200 bg-amber-100 text-[10px] uppercase tracking-wider text-amber-700">
            {t('pinned')}
          </Badge>
        )}
      </div>

      {/* Title */}
      <Link href={`/ideas/${idea.id}`} className="block">
        <h3 className="line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-organic-terracotta">
          {idea.title}
        </h3>
      </Link>

      {/* Body preview */}
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {idea.body}
      </p>

      {/* Bottom metadata row */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Author */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                {getInitials(idea.author?.name, idea.author?.email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{authorName}</span>
          </div>

          {/* Timestamp */}
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(idea.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Vote count — click to upvote */}
          <button
            type="button"
            onClick={() => onVote(idea.id, vote === 1 ? 'none' : 'up')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all duration-200',
              vote === 1
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label={t('upvote')}
          >
            <ArrowUp
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                vote === 1 && 'scale-110'
              )}
            />
            <span className="font-mono">{idea.score}</span>
          </button>

          {/* Comment count */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="font-mono">{idea.comments_count ?? 0}</span>
          </span>

          {/* Linked proposal */}
          {idea.promoted_to_proposal_id && (
            <Link
              href={`/proposals/${idea.promoted_to_proposal_id}`}
              className="text-xs font-medium text-organic-terracotta hover:text-organic-terracotta-hover"
            >
              {t('linkedProposal')}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
