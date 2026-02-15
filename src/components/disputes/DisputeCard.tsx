'use client';

import { Link } from '@/i18n/navigation';
import { Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { DisputeListItem } from '@/features/disputes/types';
import type { DisputeStatus, DisputeTier } from '@/features/disputes/types';
import { DisputeStatusBadge } from './DisputeStatusBadge';
import { DisputeTierBadge } from './DisputeTierBadge';

interface DisputeCardProps {
  dispute: DisputeListItem;
}

export function DisputeCard({ dispute }: DisputeCardProps) {
  const t = useTranslations('Disputes');
  const taskTitle = dispute.task?.title || t('detail.task');
  const displayName =
    dispute.disputant?.name ||
    (dispute.disputant?.organic_id
      ? `ORG-${dispute.disputant.organic_id}`
      : dispute.disputant?.email?.split('@')[0] || '');

  return (
    <Link
      href={`/disputes/${dispute.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {taskTitle}
            </h3>
            <DisputeStatusBadge status={dispute.status as DisputeStatus} showIcon={false} />
            <DisputeTierBadge tier={dispute.tier as DisputeTier} />
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {t(`reason.${dispute.reason}`)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{displayName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatDistanceToNow(new Date(dispute.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {dispute.xp_stake} XP {t('xpStake').toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
