'use client';

import { Link } from '@/i18n/navigation';
import { User, Calendar, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { ProposalListItem, ProposalStatus, ProposalCategory } from '@/features/proposals/types';
import { CategoryBadge } from './CategoryBadge';
import { StatusBadge } from './StatusBadge';

interface ProposalCardProps {
  proposal: ProposalListItem;
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const t = useTranslations('Proposals');
  const isVoting = proposal.status === 'voting';
  const votingEndsAt = proposal.voting_ends_at ? new Date(proposal.voting_ends_at) : null;
  const votingEndsLabel = votingEndsAt
    ? formatDistanceToNow(votingEndsAt, { addSuffix: true })
    : t('votingOpen');

  // Show summary if available, fall back to body for legacy proposals
  const previewText = proposal.summary || proposal.body;

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className={`block rounded-lg border p-6 transition-shadow ${
        isVoting
          ? 'relative overflow-hidden border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50 hover:shadow-lg'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      {isVoting && (
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-orange-200/70 blur-2xl"></div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row with badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-xl font-semibold text-gray-900 truncate">
              {proposal.title}
            </h3>
            {isVoting && (
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                {t('liveVoting')}
              </span>
            )}
            <StatusBadge status={proposal.status as ProposalStatus} showIcon={false} />
            {proposal.category && (
              <CategoryBadge category={proposal.category as ProposalCategory} showIcon={false} />
            )}
          </div>

          {/* Preview text */}
          <p className="text-gray-600 line-clamp-2 mb-4">{previewText}</p>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>
                {proposal.user_profiles.organic_id
                  ? t('organicId', { id: proposal.user_profiles.organic_id })
                  : proposal.user_profiles.email.split('@')[0]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDistanceToNow(new Date(proposal.created_at!), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{t('commentsCount', { count: proposal.comments_count || 0 })}</span>
            </div>
            {isVoting && (
              <div className="flex items-center gap-1 font-semibold text-orange-700">
                <Calendar className="w-4 h-4" />
                <span>{t('votingEndsIn', { time: votingEndsLabel })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
