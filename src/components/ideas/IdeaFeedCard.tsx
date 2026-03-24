'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ChevronUp, ChevronDown, MessageCircle, MoreVertical, Pin, Lock, Trash2, Unlock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { IdeaListItem } from '@/features/ideas';

export interface IdeaModerationAction {
  type: 'pin' | 'unpin' | 'lock' | 'unlock' | 'remove';
  ideaId: string;
}

interface IdeaFeedCardProps {
  idea: IdeaListItem;
  onVote: (ideaId: string, next: 'up' | 'down' | 'none') => void;
  onModerate?: (action: IdeaModerationAction) => void;
  canModerate?: boolean;
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

/** Relative time string (e.g. "2h ago", "3d ago") */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d`;
  const diffM = Math.floor(diffD / 30);
  return `${diffM}mo`;
}

export function IdeaFeedCard({ idea, onVote, onModerate, canModerate, isSpotlight, style }: IdeaFeedCardProps) {
  const t = useTranslations('Ideas');
  const vote = idea.user_vote;
  const [animating, setAnimating] = useState<'up' | 'down' | null>(null);

  const authorName = idea.author?.organic_id
    ? `Organic #${idea.author.organic_id}`
    : idea.author?.name ?? idea.author?.email ?? t('unknownAuthor');

  function handleVote(direction: 'up' | 'down') {
    const next =
      (direction === 'up' && vote === 1) || (direction === 'down' && vote === -1)
        ? 'none'
        : direction;
    setAnimating(direction);
    onVote(idea.id, next);
    setTimeout(() => setAnimating(null), 300);
  }

  return (
    <article
      className={cn(
        'group rounded-xl border bg-card transition-shadow duration-200 hover:shadow-md',
        isSpotlight
          ? 'border-l-4 border-l-organic-terracotta border-t-border border-r-border border-b-border'
          : 'border-border'
      )}
      style={style}
    >
      <div className="flex">
        {/* Vote rail — Reddit/ProductHunt style */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-border py-3 sm:w-14">
          <button
            type="button"
            onClick={() => handleVote('up')}
            className={cn(
              'rounded-lg p-1 transition-all duration-200 ease-out',
              vote === 1
                ? 'bg-organic-terracotta text-white'
                : 'text-muted-foreground hover:bg-organic-terracotta-lightest hover:text-organic-terracotta',
              animating === 'up' && 'scale-110'
            )}
            aria-label={t('upvote')}
          >
            <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <span
            className={cn(
              'font-mono text-sm font-bold tabular-nums transition-colors duration-200',
              vote === 1 && 'text-organic-terracotta',
              vote === -1 && 'text-muted-foreground',
              vote === 0 && 'text-foreground'
            )}
          >
            {idea.score}
          </span>
          <button
            type="button"
            onClick={() => handleVote('down')}
            className={cn(
              'rounded-lg p-1 transition-all duration-200 ease-out',
              vote === -1
                ? 'bg-muted text-muted-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              animating === 'down' && 'scale-110'
            )}
            aria-label={t('downvote')}
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1 p-4">
          {/* Author + badges row */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                {getInitials(idea.author?.name, idea.author?.email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-muted-foreground">{authorName}</span>
            <span className="text-xs text-muted-foreground/60">{relativeTime(idea.created_at)}</span>

            {/* Badges */}
            <div className="ml-auto flex items-center gap-1.5">
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
              {canModerate && onModerate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      aria-label="Moderation actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => onModerate({ type: idea.is_pinned ? 'unpin' : 'pin', ideaId: idea.id })}
                    >
                      <Pin className="mr-2 h-4 w-4" />
                      {idea.is_pinned ? t('modUnpin') : t('modPin')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onModerate({
                          type: idea.status === 'locked' ? 'unlock' : 'lock',
                          ideaId: idea.id,
                        })
                      }
                    >
                      {idea.status === 'locked' ? (
                        <><Unlock className="mr-2 h-4 w-4" />{t('modUnlock')}</>
                      ) : (
                        <><Lock className="mr-2 h-4 w-4" />{t('modLock')}</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onModerate({ type: 'remove', ideaId: idea.id })}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('modRemove')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Title */}
          <Link href={`/ideas/${idea.id}`} className="mt-2 block group-hover:no-underline">
            <h3 className="line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-organic-terracotta">
              {idea.title}
            </h3>
          </Link>

          {/* Body preview */}
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {idea.body}
          </p>

          {/* Bottom meta */}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <Link
              href={`/ideas/${idea.id}`}
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="font-mono">{idea.comments_count ?? 0}</span>
            </Link>
            {idea.promoted_to_proposal_id && (
              <Link
                href={`/proposals/${idea.promoted_to_proposal_id}`}
                className="font-medium text-organic-terracotta hover:text-organic-terracotta-hover"
              >
                {t('linkedProposal')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Skeleton loader that matches the vote rail card layout */
export function IdeaCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex">
        <div className="flex w-12 flex-col items-center gap-1 border-r border-border px-2 py-3 sm:w-14">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-6 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="mt-2 h-5 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-2/3" />
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
