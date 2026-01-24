'use client';

import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import type { Member } from '@/features/tasks';

type TaskAssignModalProps = {
  open: boolean;
  members: Member[];
  assigneeId: string | null;
  isAssigning: boolean;
  onAssign: (assigneeId: string) => void;
  onClose: () => void;
  getDisplayName: (member: Member) => string;
};

export function TaskAssignModal({
  open,
  members,
  assigneeId,
  isAssigning,
  onAssign,
  onClose,
  getDisplayName,
}: TaskAssignModalProps) {
  const t = useTranslations('TaskDetail');

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{t('assignTitle')}</h3>
        <p className="text-gray-600 mb-4">{t('assignDescription')}</p>

        <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
          <button
            onClick={() => onAssign('')}
            disabled={isAssigning}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
              !assigneeId
                ? 'border-organic-orange bg-orange-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${isAssigning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{t('unassigned')}</div>
                <div className="text-sm text-gray-500">{t('unassignedHelp')}</div>
              </div>
            </div>
          </button>

          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => onAssign(member.id)}
              disabled={isAssigning}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                assigneeId === member.id
                  ? 'border-organic-orange bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${isAssigning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center">
                  <span className="text-white font-bold">
                    {getDisplayName(member)[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{getDisplayName(member)}</div>
                  <div className="text-sm text-gray-500">{member.email}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isAssigning}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
