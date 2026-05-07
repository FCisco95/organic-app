'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Lock, Star } from 'lucide-react';
import type { MemberListItem } from '@/features/members';
import { ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';
import { LevelBadge } from '@/components/reputation/level-badge';
import { formatXp } from '@/features/reputation';
import { EasterEggBadge } from '@/components/gamification/easter-egg-badge';

interface MemberCardProps {
  member: MemberListItem;
  rank?: number;
  xpTotal?: number;
}

export function MemberCard({ member, rank, xpTotal }: MemberCardProps) {
  const locale = useLocale();
  const t = useTranslations('Members');

  const displayName =
    member.name || (member.organic_id ? `ORG-${member.organic_id}` : t('anonymous'));

  if (!member.profile_visible) {
    return (
      <div className="bg-card rounded-xl border border-border p-5" data-testid="member-card-private">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock aria-hidden="true" className="w-5 h-5 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{t('privateMember')}</p>
            {member.organic_id && <p className="text-sm text-gray-400">ORG-{member.organic_id}</p>}
            <p className="text-xs text-muted-foreground mt-1">{t('privateMemberDescription')}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star aria-hidden="true" className="w-3.5 h-3.5 text-gray-400" />
            {member.total_points} {t('points')}
          </span>
          <span>
            {member.tasks_completed} {t('tasks')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/${locale}/community/${member.id}`}
      data-testid={`member-card-${member.id}`}
      className="relative block bg-card rounded-xl border border-border p-5 hover:border-organic-terracotta/40 hover:shadow-sm transition-all"
    >
      {rank != null && rank <= 100 && (
        <span className="absolute top-2 right-2 bg-organic-terracotta text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          #{rank}
        </span>
      )}
      <div className="flex items-center gap-3">
        {member.avatar_url ? (
          <Image
            src={member.avatar_url}
            alt={displayName}
            width={48}
            height={48}
            className="rounded-full object-cover border-2 border-border"
            unoptimized
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-organic-terracotta to-organic-yellow flex items-center justify-center border-2 border-border">
            <span className="text-white font-bold text-lg">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{displayName}</p>
            <EasterEggBadge elements={member.easter_2026_egg_elements} />
            {member.role && member.role !== 'guest' && (
              <span
                data-testid="member-role-badge"
                className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[member.role as UserRole]}`}
              >
                {ROLE_LABELS[member.role as UserRole]}
              </span>
            )}
            {member.level > 1 && (
              <span data-testid="member-level-badge">
                <LevelBadge level={member.level} showName={false} />
              </span>
            )}
          </div>
          {member.organic_id && <p className="text-sm text-muted-foreground">ORG-{member.organic_id}</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star aria-hidden="true" className="w-3.5 h-3.5 text-organic-terracotta" />
          {member.total_points} {t('points')}
        </span>
        <span>
          {member.tasks_completed} {t('tasks')}
        </span>
        {xpTotal != null && (
          <span className="ml-auto font-mono tabular-nums text-xs text-organic-terracotta font-medium">
            {formatXp(xpTotal)} XP
          </span>
        )}
      </div>
    </Link>
  );
}
