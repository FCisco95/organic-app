'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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

const STATUS_ICONS: Record<RestrictionStatus, typeof CheckCircle> = {
  active: CheckCircle,
  warned: AlertTriangle,
  restricted: ShieldAlert,
  banned: Ban,
};

const STATUS_COLORS: Record<RestrictionStatus, string> = {
  active: 'text-emerald-400 bg-emerald-400/10',
  warned: 'text-yellow-400 bg-yellow-400/10',
  restricted: 'text-orange-400 bg-orange-400/10',
  banned: 'text-red-400 bg-red-400/10',
};

const ACTION_COLORS: Record<RestrictionAction, string> = {
  warn: 'bg-yellow-600 hover:bg-yellow-700',
  restrict: 'bg-orange-600 hover:bg-orange-700',
  ban: 'bg-red-600 hover:bg-red-700',
  unrestrict: 'bg-emerald-600 hover:bg-emerald-700',
};

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

function StatusBadge({ status, label }: { status: RestrictionStatus; label: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
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
  const t = useTranslations('AdminDashboard.users');
  const tAdmin = useTranslations('AdminDashboard');
  const isAdmin = profile?.role === 'admin';
  const isAdminOrCouncil = isAdmin || profile?.role === 'council';

  const statusLabels: Record<RestrictionStatus, string> = useMemo(
    () => ({
      active: t('statusActive'),
      warned: t('statusWarned'),
      restricted: t('statusRestricted'),
      banned: t('statusBanned'),
    }),
    [t]
  );

  const actionLabels: Record<RestrictionAction, string> = useMemo(
    () => ({
      warn: t('actionWarn'),
      restrict: t('actionRestrict'),
      ban: t('actionBan'),
      unrestrict: t('actionUnrestrict'),
    }),
    [t]
  );

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
            <h2 className="mb-2 text-xl font-semibold text-foreground">{tAdmin('accessDenied')}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{t('accessDeniedDesc')}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
              >
                <Home className="h-4 w-4" />
                {tAdmin('goHome')}
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <div className="space-y-6" data-testid="admin-users-page">
        <PageHero
          icon={Users}
          title={t('title')}
          description={t('description')}
          variant="dark"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
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
              <option value="">{t('filterAllStatuses')}</option>
              <option value="active">{statusLabels.active}</option>
              <option value="warned">{statusLabels.warned}</option>
              <option value="restricted">{statusLabels.restricted}</option>
              <option value="banned">{statusLabels.banned}</option>
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
            {t('filterFlagged')}
          </button>

          {isAdmin && (
            <button
              onClick={handleRunFlagCheck}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t('runFlagCheck')}
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && isAdmin && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {t('selectedCount', { count: selectedIds.size })}
            </span>
            <div className="ml-auto flex gap-2">
              {(['warn', 'restrict', 'ban', 'unrestrict'] as const).map((action) => (
                <button
                  key={action}
                  onClick={() =>
                    openRestrictionDialog(action, Array.from(selectedIds))
                  }
                  className={`rounded-md px-3 py-2 text-xs font-medium text-white transition-colors ${ACTION_COLORS[action]}`}
                >
                  {actionLabels[action]}
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
                  {t('tableUser')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('tableStatus')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  {t('tableXp')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  {t('tablePoints')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  {t('tableComments')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('tableJoined')}
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('tableActions')}
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
                    {t('empty')}
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
                              {user.name ?? t('unnamed')}
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
                      <StatusBadge
                        status={user.restriction_status}
                        label={statusLabels[user.restriction_status]}
                      />
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
                                  className="inline-flex items-center min-h-[44px] rounded px-2 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-400/10"
                                >
                                  {actionLabels.warn}
                                </button>
                              )}
                              <button
                                onClick={() => openRestrictionDialog('restrict', [user.id])}
                                className="inline-flex items-center min-h-[44px] rounded px-2 py-2 text-xs font-medium text-orange-400 hover:bg-orange-400/10"
                              >
                                {actionLabels.restrict}
                              </button>
                              <button
                                onClick={() => openRestrictionDialog('ban', [user.id])}
                                className="inline-flex items-center min-h-[44px] rounded px-2 py-2 text-xs font-medium text-red-400 hover:bg-red-400/10"
                              >
                                {actionLabels.ban}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openRestrictionDialog('unrestrict', [user.id])}
                              className="inline-flex items-center min-h-[44px] rounded px-2 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-400/10"
                            >
                              {actionLabels.unrestrict}
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
              {t('showingCount', { shown: users.length, total })}
            </div>
          )}
        </div>
      </div>

      {/* Restriction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogTargets.length > 1
                ? t('dialogTitlePlural', {
                    action: actionLabels[dialogAction],
                    count: dialogTargets.length,
                  })
                : t('dialogTitleSingle', { action: actionLabels[dialogAction] })}
            </DialogTitle>
            <DialogDescription>
              {dialogTargets.length > 1
                ? t('dialogDescPlural', {
                    action: actionLabels[dialogAction],
                    count: dialogTargets.length,
                  })
                : t('dialogDescSingle', { action: actionLabels[dialogAction] })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t('dialogReasonLabel')} <span className="text-red-400">*</span>
            </label>
            <textarea
              value={dialogReason}
              onChange={(e) => setDialogReason(e.target.value)}
              placeholder={t('dialogReasonPlaceholder')}
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
              {t('dialogCancel')}
            </button>
            <button
              onClick={handleRestrict}
              disabled={!dialogReason.trim() || submitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${ACTION_COLORS[dialogAction]}`}
            >
              {submitting ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                t('dialogConfirm', { action: actionLabels[dialogAction] })
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
