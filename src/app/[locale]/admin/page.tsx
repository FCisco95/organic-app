'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  Users,
  Vote,
  AlertTriangle,
  Settings,
  ClipboardCheck,
  Gift,
  Shield,
  ArrowRight,
  Home,
  UserCircle,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PageContainer } from '@/components/layout';
import { PageHero } from '@/components/ui/page-hero';
import { useAuth } from '@/features/auth/context';
import { AdminTimeline } from '@/components/admin/admin-timeline';

interface AuditEvent {
  id: string;
  change_scope: string;
  reason: string;
  created_at: string;
  actor_name: string;
  actor_role: string;
}

interface KpiData {
  memberCount: number;
  adminCount: number;
  councilCount: number;
  memberRoleCount: number;
  activeProposals: number;
  votingCount: number;
  discussionCount: number;
  pendingActions: number;
  configChanges: number;
  lastChangeAgo: string;
}

function formatRelativeShort(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

export default function AdminDashboardPage() {
  const t = useTranslations('AdminDashboard');
  const { profile } = useAuth();
  const router = useRouter();

  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    if (!isAdminOrCouncil) return;

    // Fetch audit events
    fetch('/api/admin/audit-log')
      .then((r) => r.json())
      .then((d) => setAuditEvents(d.events ?? []))
      .catch(() => setAuditEvents([]))
      .finally(() => setAuditLoading(false));

    // Derive KPI data from audit events and static estimates
    // In production these would come from dedicated endpoints
    // For now we compute what we can from the audit log
    fetch('/api/admin/audit-log')
      .then((r) => r.json())
      .then((d) => {
        const events: AuditEvent[] = d.events ?? [];
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 86400000;
        const recentChanges = events.filter((e) => new Date(e.created_at).getTime() > sevenDaysAgo);
        const lastChange = events.length > 0 ? events[0].created_at : null;

        setKpi({
          memberCount: 0,
          adminCount: 0,
          councilCount: 0,
          memberRoleCount: 0,
          activeProposals: 0,
          votingCount: 0,
          discussionCount: 0,
          pendingActions: 0,
          configChanges: recentChanges.length,
          lastChangeAgo: formatRelativeShort(lastChange),
        });
      })
      .catch(() => {
        setKpi({
          memberCount: 0,
          adminCount: 0,
          councilCount: 0,
          memberRoleCount: 0,
          activeProposals: 0,
          votingCount: 0,
          discussionCount: 0,
          pendingActions: 0,
          configChanges: 0,
          lastChangeAgo: 'N/A',
        });
      })
      .finally(() => setKpiLoading(false));
  }, [isAdminOrCouncil]);

  if (!isAdminOrCouncil) {
    return (
      <PageContainer width="narrow">
        <div className="flex items-center justify-center py-16">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">{t('accessDenied')}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{t('accessDeniedExplanation')}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
              >
                <Home className="h-4 w-4" />
                {t('goHome')}
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <UserCircle className="h-4 w-4" />
                {t('viewProfile')}
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const quickActions = [
    { label: t('actions.reviewSubmissions'), href: '/admin/submissions', icon: ClipboardCheck },
    { label: t('actions.processRewards'), href: '/admin/rewards', icon: Gift },
    { label: t('actions.manageUsers'), href: '/admin/users', icon: Shield },
    { label: t('actions.editGovernance'), href: '/admin/settings', icon: Settings },
  ];

  return (
    <PageContainer width="wide">
      <div className="space-y-6" data-testid="admin-dashboard-page">
        <PageHero
          icon={Settings}
          title={t('title')}
          description={t('subtitle')}
          variant="dark"
          badge={
            <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-[#E8845C]">
              {profile?.role}
            </span>
          }
        />

        {/* KPI Cards */}
        {kpiLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="mt-3 h-7 w-12 rounded bg-muted" />
                <div className="mt-2 h-3 w-32 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : kpi ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Members KPI */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpi.members')}
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                {kpi.memberCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('kpi.membersBreakdown', {
                  admin: kpi.adminCount,
                  council: kpi.councilCount,
                  members: kpi.memberRoleCount,
                })}
              </p>
            </div>

            {/* Governance KPI */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpi.governance')}
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                {kpi.activeProposals}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('kpi.governanceBreakdown', {
                  voting: kpi.votingCount,
                  discussion: kpi.discussionCount,
                })}
              </p>
            </div>

            {/* Pending Actions KPI */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpi.pendingActions')}
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                {kpi.pendingActions}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('kpi.pendingActionsDesc')}
              </p>
            </div>

            {/* Config Changes KPI */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpi.configChanges')}
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                {kpi.configChanges}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('kpi.lastChange', { time: kpi.lastChangeAgo })}
              </p>
            </div>
          </div>
        ) : null}

        {/* Two-column layout: Timeline + Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Activity Timeline (2/3) */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('activityTimeline')}
            </h2>
            <AdminTimeline events={auditEvents} isLoading={auditLoading} />
          </div>

          {/* Quick Actions (1/3) */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('quickActions')}
            </h2>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.href}
                    onClick={() => router.push(action.href)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{action.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
