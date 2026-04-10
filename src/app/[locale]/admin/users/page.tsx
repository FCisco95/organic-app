'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  Search,
  Shield,
  ShieldAlert,
  Ban,
  AlertTriangle,
  CheckCircle,
  Flag,
  UserCircle,
  Home,
  ChevronDown,
  Loader2,
  Users,
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { PageHero } from '@/components/ui/page-hero';
import { useAuth } from '@/features/auth/context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

type RestrictionStatus = 'active' | 'warned' | 'restricted' | 'banned';
type RestrictionAction = 'warn' | 'restrict' | 'ban' | 'unrestrict';

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  organic_id: number | null;
  avatar_url: string | null;
  role: string;
  xp_total: number;
  level: number;
  total_points: number;
  restriction_status: RestrictionStatus;
  restriction_reason: string | null;
  restricted_at: string | null;
  flagged: boolean;
  created_at: string;
  last_active_date: string | null;
  comment_count: number;
}

const statusConfig: Record<
  RestrictionStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  active: { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle },
  warned: { label: 'Warned', color: 'text-yellow-400 bg-yellow-400/10', icon: AlertTriangle },
  restricted: { label: 'Restricted', color: 'text-orange-400 bg-orange-400/10', icon: ShieldAlert },
  banned: { label: 'Banned', color: 'text-red-400 bg-red-400/10', icon: Ban },
};

function StatusBadge({ status }: { status: RestrictionStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';
  const isAdminOrCouncil = isAdmin || profile?.role === 'council';

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<RestrictionAction>('restrict');
  const [dialogReason, setDialogReason] = useState('');
  const [dialogTargets, setDialogTargets] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (flaggedFilter) params.set('flagged', 'true');
      params.set('limit', '50');

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, flaggedFilter]);

  useEffect(() => {
    if (!isAdminOrCouncil) return;
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers, isAdminOrCouncil]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const openRestrictionDialog = (action: RestrictionAction, targets: string[]) => {
    setDialogAction(action);
    setDialogTargets(targets);
    setDialogReason('');
    setDialogOpen(true);
  };

  const handleRestrict = async () => {
    if (!dialogReason.trim() || dialogTargets.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users/restrict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: dialogTargets,
          action: dialogAction,
          reason: dialogReason.trim(),
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setSelectedIds(new Set());
        await fetchUsers();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunFlagCheck = async () => {
    try {
      await fetch('/api/admin/users/flag-check', { method: 'POST' });
      await fetchUsers();
    } catch {
      // silently fail
    }
  };

  if (!isAdminOrCouncil) {
    return (
      <PageContainer width="narrow">
        <div className="flex items-center justify-center py-16">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Access Denied</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              You need admin or council permissions to access user management.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const actionLabels: Record<RestrictionAction, { label: string; color: string }> = {
    warn: { label: 'Warn', color: 'bg-yellow-600 hover:bg-yellow-700' },
    restrict: { label: 'Restrict', color: 'bg-orange-600 hover:bg-orange-700' },
    ban: { label: 'Ban', color: 'bg-red-600 hover:bg-red-700' },
    unrestrict: { label: 'Unrestrict', color: 'bg-emerald-600 hover:bg-emerald-700' },
  };

  return (
    <PageContainer width="wide">
      <div className="space-y-6" data-testid="admin-users-page">
        <PageHero
          icon={Users}
          title="User Management"
          description="Search, review, and moderate user accounts"
          variant="dark"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or Organic ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cta/50"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cta/50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="warned">Warned</option>
              <option value="restricted">Restricted</option>
              <option value="banned">Banned</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <button
            onClick={() => setFlaggedFilter(!flaggedFilter)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              flaggedFilter
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
            Flagged
          </button>

          {isAdmin && (
            <button
              onClick={handleRunFlagCheck}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Run Flag Check
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && isAdmin && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex gap-2">
              {(['warn', 'restrict', 'ban', 'unrestrict'] as const).map((action) => (
                <button
                  key={action}
                  onClick={() =>
                    openRestrictionDialog(action, Array.from(selectedIds))
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${actionLabels[action].color}`}
                >
                  {actionLabels[action].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {isAdmin && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  XP
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Points
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Comments
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Joined
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-4 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-muted/50 ${
                      user.flagged ? 'bg-red-500/5' : ''
                    }`}
                  >
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded border-border"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-foreground">
                              {user.name ?? 'Unnamed'}
                            </span>
                            {user.flagged && (
                              <Flag className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {user.email ?? '—'}
                            {user.organic_id ? ` · #${user.organic_id}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.restriction_status} />
                      {user.restriction_reason && (
                        <p className="mt-1 max-w-[200px] truncate text-xs text-muted-foreground">
                          {user.restriction_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground tabular-nums">
                      {user.xp_total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground tabular-nums">
                      {user.total_points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground tabular-nums">
                      {user.comment_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {user.restriction_status === 'active' || user.restriction_status === 'warned' ? (
                            <>
                              {user.restriction_status === 'active' && (
                                <button
                                  onClick={() => openRestrictionDialog('warn', [user.id])}
                                  className="rounded px-2 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-400/10"
                                >
                                  Warn
                                </button>
                              )}
                              <button
                                onClick={() => openRestrictionDialog('restrict', [user.id])}
                                className="rounded px-2 py-1 text-xs font-medium text-orange-400 hover:bg-orange-400/10"
                              >
                                Restrict
                              </button>
                              <button
                                onClick={() => openRestrictionDialog('ban', [user.id])}
                                className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-400/10"
                              >
                                Ban
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openRestrictionDialog('unrestrict', [user.id])}
                              className="rounded px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-400/10"
                            >
                              Unrestrict
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          {total > 0 && (
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Showing {users.length} of {total} users
            </div>
          )}
        </div>
      </div>

      {/* Restriction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{dialogAction} User{dialogTargets.length > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              {dialogTargets.length > 1
                ? `This will ${dialogAction} ${dialogTargets.length} users.`
                : `This will ${dialogAction} the selected user.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={dialogReason}
              onChange={(e) => setDialogReason(e.target.value)}
              placeholder="Enter the reason for this action..."
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cta/50"
            />
            <p className="text-xs text-muted-foreground">{dialogReason.length}/500</p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleRestrict}
              disabled={!dialogReason.trim() || submitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${actionLabels[dialogAction].color}`}
            >
              {submitting ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                `Confirm ${actionLabels[dialogAction].label}`
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
