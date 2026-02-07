'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Search, Shield } from 'lucide-react';
import { useMembers, useUpdateMemberRole, ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';

export function MembersTab() {
  const t = useTranslations('Settings');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useMembers({ search, limit: 50 });
  const updateRole = useUpdateMemberRole();

  const handleRoleChange = (memberId: string, role: UserRole) => {
    updateRole.mutate({ memberId, role });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.members')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('members.description')}</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('members.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
        />
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">{t('members.member')}</div>
          <div className="col-span-3">{t('members.organicId')}</div>
          <div className="col-span-4">{t('members.role')}</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !data?.members.length ? (
          <div className="p-8 text-center text-gray-500">{t('members.noMembers')}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.members.map((member) => {
              const displayName =
                member.name ||
                (member.organic_id ? `ORG-${member.organic_id}` : member.email?.split('@')[0]);
              return (
                <div key={member.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                  {/* Member */}
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt={displayName}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {displayName[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-gray-900 truncate">{displayName}</span>
                  </div>

                  {/* Organic ID */}
                  <div className="col-span-3 text-sm text-gray-500">
                    {member.organic_id ? `ORG-${member.organic_id}` : '—'}
                  </div>

                  {/* Role selector */}
                  <div className="col-span-4 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={member.role ?? 'guest'}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                      disabled={updateRole.isPending}
                      className={`text-xs px-2 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-organic-orange/30 ${
                        ROLE_COLORS[(member.role as UserRole) ?? 'guest']
                      }`}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
