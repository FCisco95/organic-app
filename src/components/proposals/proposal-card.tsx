'use client';

import { Link } from '@/i18n/navigation';
import { MessageCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProposalListItem, ProposalStatus, ProposalCategory } from '@/features/proposals/types';
import { PROPOSAL_CATEGORY_BORDER_COLORS } from '@/features/proposals/types';
import { StatusBadge } from './status-badge';

interface ProposalCardProps {
  proposal: ProposalListItem;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

const CATEGORY_BG_SUBTLE: Record<ProposalCategory, string> = {
  feature: 'bg-blue-50/40',
  governance: 'bg-purple-50/40',
  treasury: 'bg-green-50/40',
  community: 'bg-organic-terracotta-lightest/40',
  development: 'bg-cyan-50/40',
};

const AVATAR_COLORS: Record<ProposalCategory, string> = {
  feature: 'bg-blue-100 text-blue-700',
  governance: 'bg-purple-100 text-purple-700',
  treasury: 'bg-green-100 text-green-700',
  community: 'bg-organic-terracotta-light/30 text-organic-terracotta-hover',
  development: 'bg-cyan-100 text-cyan-700',
};

export function ProposalCard({ proposal }: ProposalCardProps) {
  const t = useTranslations('Proposals');
  const isVoting = proposal.status === 'voting';
  const category = (proposal.category ?? 'feature') as ProposalCategory;
  const borderColor = PROPOSAL_CATEGORY_BORDER_COLORS[category];
  const bgSubtle = isVoting ? 'bg-organic-terracotta-lightest/60' : CATEGORY_BG_SUBTLE[category];
  const avatarColor = AVATAR_COLORS[category];
  const initials = getInitials(proposal.user_profiles.email);
  const previewText = proposal.summary || proposal.body || '';
  const commentsCount = proposal.comments_count ?? 0;
  const timeAgo = proposal.created_at
    ? formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })
    : '';

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      data-testid={`proposal-card-${proposal.id}`}
      className={cn(
        'group flex gap-0 rounded-xl border border-border overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:border-slate-300',
        isVoting && 'ring-2 ring-organic-terracotta/60 border-organic-terracotta-light'
      )}
    >
      {/* Left category stripe — turns orange on hover */}
      <div className={cn('w-1 flex-shrink-0 border-l-4 transition-colors', borderColor, 'group-hover:border-l-organic-terracotta', bgSubtle)} />

      {/* Card body */}
      <div className={cn('flex-1 px-4 py-3.5', bgSubtle)}>
        <div className="flex items-start gap-3">
          {/* Author avatar */}
          <div
            className={cn(
              'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
              avatarColor
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-organic-terracotta-hover transition-colors">
                {proposal.title}
              </h3>
              <div className="flex-shrink-0">
                <StatusBadge status={proposal.status as ProposalStatus} showIcon={false} />
              </div>
            </div>

            {/* Preview text */}
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {previewText}
            </p>

            {/* Meta row */}
            <div
              className="mt-2.5 flex items-center gap-3 text-xs text-slate-400"
              data-testid={`proposal-card-meta-${proposal.id}`}
            >
              {/* Comments */}
              <div
                className={cn(
                  'flex items-center gap-1 font-semibold',
                  commentsCount > 0 ? 'text-organic-terracotta' : 'text-slate-400'
                )}
              >
                {isVoting && (
                  <span className="relative mr-0.5 flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-organic-terracotta opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-organic-terracotta-lightest0" />
                  </span>
                )}
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t('commentsCount', { count: commentsCount })}</span>
              </div>

              {/* Time ago */}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{timeAgo}</span>
              </div>

              {/* Author */}
              <div className="hidden sm:block truncate">
                {proposal.user_profiles.organic_id
                  ? t('organicId', { id: proposal.user_profiles.organic_id })
                  : proposal.user_profiles.email.split('@')[0]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
