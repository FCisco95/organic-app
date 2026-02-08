'use client';

import { useState } from 'react';
import { Users, ArrowRight, X, Loader2, Search, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDelegations,
  useDelegate,
  useRevokeDelegation,
  DELEGATION_CATEGORY_LABELS,
  type DelegationCategory,
} from '@/features/voting';
import { useAuth } from '@/features/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface DelegationPanelProps {
  className?: string;
}

export function DelegationPanel({ className }: DelegationPanelProps) {
  const { user } = useAuth();
  const { data, isLoading } = useDelegations();
  const delegate = useDelegate();
  const revoke = useRevokeDelegation();

  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DelegationCategory | null>(null);
  const [search, setSearch] = useState('');

  // Fetch members for delegate picker
  const supabase = createClient();
  const { data: members } = useQuery({
    queryKey: ['members-for-delegation', search],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select('id, name, email, organic_id, avatar_url, role')
        .in('role', ['member', 'council', 'admin'])
        .neq('id', user?.id ?? '')
        .limit(20);

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: showPicker,
  });

  const handleDelegate = async (delegateId: string) => {
    try {
      await delegate.mutateAsync({
        delegate_id: delegateId,
        category: selectedCategory,
      });
      toast.success('Delegation created');
      setShowPicker(false);
      setSearch('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delegate');
    }
  };

  const handleRevoke = async (delegationId: string) => {
    try {
      await revoke.mutateAsync({ delegation_id: delegationId });
      toast.success('Delegation revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke');
    }
  };

  if (!user) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Vote Delegation
        </h3>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-organic-orange hover:text-orange-600 font-medium"
        >
          {showPicker ? 'Cancel' : '+ Delegate'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <>
          {/* Outgoing delegations */}
          {data?.outgoing && data.outgoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Your Delegations</p>
              {data.outgoing.map((del) => (
                <div
                  key={del.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 text-sm"
                >
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700">
                      {del.delegate?.name || del.delegate?.email || 'Unknown'}
                    </span>
                    {del.category ? (
                      <span className="ml-2 text-xs text-gray-400">
                        ({DELEGATION_CATEGORY_LABELS[del.category]})
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-gray-400">(Global)</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(del.id)}
                    disabled={revoke.isPending}
                    className="text-gray-400 hover:text-red-500"
                    title="Revoke delegation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Incoming delegations */}
          {data?.incoming && data.incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Delegated to You</p>
              {data.incoming.map((del) => (
                <div
                  key={del.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-sm"
                >
                  <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700">
                      {del.delegator?.name || del.delegator?.email || 'Unknown'}
                    </span>
                    {del.category ? (
                      <span className="ml-2 text-xs text-gray-400">
                        ({DELEGATION_CATEGORY_LABELS[del.category]})
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-gray-400">(Global)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!data?.outgoing || data.outgoing.length === 0) &&
            (!data?.incoming || data.incoming.length === 0) &&
            !showPicker && (
              <p className="text-xs text-gray-400 text-center py-2">
                No active delegations. Delegate your voting power to a trusted member.
              </p>
            )}
        </>
      )}

      {/* Delegation picker */}
      {showPicker && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Category selector */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <label className="block text-xs font-medium text-gray-500 mb-1">Scope</label>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  selectedCategory === null
                    ? 'bg-organic-orange text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                )}
              >
                Global
              </button>
              {Object.entries(DELEGATION_CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as DelegationCategory)}
                  className={cn(
                    'px-2 py-1 text-xs rounded',
                    selectedCategory === key
                      ? 'bg-organic-orange text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Member search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-9 pr-3 py-2 text-sm border-b border-gray-200 focus:outline-none focus:border-organic-orange"
              autoFocus
            />
          </div>

          {/* Member list */}
          <div className="max-h-48 overflow-y-auto">
            {members?.map((member) => (
              <button
                key={member.id}
                onClick={() => handleDelegate(member.id)}
                disabled={delegate.isPending}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                  {(member.name || member.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate font-medium">
                    {member.name || member.email}
                  </span>
                  {member.name && (
                    <span className="block text-xs text-gray-400 truncate">{member.email}</span>
                  )}
                </div>
                {member.organic_id && (
                  <span className="text-xs text-organic-orange">#{member.organic_id}</span>
                )}
              </button>
            ))}
            {(!members || members.length === 0) && (
              <p className="text-xs text-gray-400 py-3 text-center">No members found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
