'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DisputeWithRelations } from '@/features/disputes/types';

interface DisputeParticipantsProps {
  dispute: DisputeWithRelations;
  isParty?: boolean;
}

function UserRow({
  label,
  user,
  hasId,
  unassignedLabel,
  restrictedLabel,
}: {
  label: string;
  user?: {
    name?: string | null;
    email?: string;
    organic_id?: number | null;
    avatar_url?: string | null;
  } | null;
  hasId: boolean;
  unassignedLabel: string;
  restrictedLabel: string;
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
      ) : hasId ? (
        <span className="text-sm italic text-gray-400">{restrictedLabel}</span>
      ) : (
        <span className="text-sm text-gray-400">{unassignedLabel}</span>
      )}
    </div>
  );
}

export function DisputeParticipants({ dispute, isParty = true }: DisputeParticipantsProps) {
  const td = useTranslations('Disputes.detail');

  // When the viewer is not a dispute party, the API strips participant data.
  // Show "restricted" for disputant/reviewer (always assigned), and for arbitrator only if we know one exists.
  const disputantHasId = isParty ? Boolean(dispute.disputant_id) : true;
  const reviewerHasId = isParty ? Boolean(dispute.reviewer_id) : true;
  const arbitratorHasId = isParty ? Boolean(dispute.arbitrator_id) : Boolean(dispute.arbitrator);

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <UserRow label={td('disputant')} user={dispute.disputant} hasId={disputantHasId} unassignedLabel={td('unassigned')} restrictedLabel={td('restricted')} />
      <UserRow label={td('reviewer')} user={dispute.reviewer} hasId={reviewerHasId} unassignedLabel={td('unassigned')} restrictedLabel={td('restricted')} />
      <UserRow label={td('arbitrator')} user={dispute.arbitrator} hasId={arbitratorHasId} unassignedLabel={td('unassigned')} restrictedLabel={td('restricted')} />

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
