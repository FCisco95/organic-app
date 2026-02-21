'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Lock, Star } from 'lucide-react';
import type { MemberListItem } from '@/features/members';
import { ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';
import { LevelBadge } from '@/components/reputation/level-badge';

interface MemberCardProps {
  member: MemberListItem;
}

export function MemberCard({ member }: MemberCardProps) {
  const locale = useLocale();
  const t = useTranslations('Members');

  const displayName =
    member.name || (member.organic_id ? `ORG-${member.organic_id}` : t('anonymous'));

  if (!member.profile_visible) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-500">{t('privateMember')}</p>
            {member.organic_id && <p className="text-sm text-gray-400">ORG-{member.organic_id}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/${locale}/members/${member.id}`}
      data-testid={`member-card-${member.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-organic-orange/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        {member.avatar_url ? (
          <Image
            src={member.avatar_url}
            alt={displayName}
            width={48}
            height={48}
            className="rounded-full object-cover border-2 border-gray-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-gray-100">
            <span className="text-white font-bold text-lg">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{displayName}</p>
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
          {member.organic_id && <p className="text-sm text-gray-500">ORG-{member.organic_id}</p>}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-organic-orange" />
          {member.total_points} {t('points')}
        </span>
        <span>
          {member.tasks_completed} {t('tasks')}
        </span>
      </div>
    </Link>
  );
}
