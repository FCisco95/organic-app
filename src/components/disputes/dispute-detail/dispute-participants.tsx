'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DisputeWithRelations } from '@/features/disputes/types';

interface DisputeParticipantsProps {
  dispute: DisputeWithRelations;
}

function UserRow({
  label,
  user,
  unassignedLabel,
}: {
  label: string;
  user?: {
    name?: string | null;
    email?: string;
    organic_id?: number | null;
    avatar_url?: string | null;
  } | null;
  unassignedLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-gray-500">{label}</span>
      {user ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="bg-gray-200 text-[10px]">
              {(user.name || user.email || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-900">
            {user.name || (user.organic_id ? `ORG-${user.organic_id}` : user.email?.split('@')[0])}
          </span>
        </div>
      ) : (
        <span className="text-sm text-gray-400">{unassignedLabel}</span>
      )}
    </div>
  );
}

export function DisputeParticipants({ dispute }: DisputeParticipantsProps) {
  const td = useTranslations('Disputes.detail');

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <UserRow label={td('disputant')} user={dispute.disputant} unassignedLabel={td('unassigned')} />
      <UserRow label={td('reviewer')} user={dispute.reviewer} unassignedLabel={td('unassigned')} />
      <UserRow label={td('arbitrator')} user={dispute.arbitrator} unassignedLabel={td('unassigned')} />

      {dispute.task && (
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs text-gray-500">{td('task')}</span>
          <Link
            href={`/tasks/${dispute.task.id}`}
            className="flex items-center gap-1 text-sm text-orange-600 hover:underline"
          >
            {dispute.task.title}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
