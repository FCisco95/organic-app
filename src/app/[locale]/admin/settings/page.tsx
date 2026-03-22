'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  ShieldAlert,
  ChevronRight,
  Coins,
  Wallet,
  Vote,
  Zap,
  Users,
  Gift,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useOrganization } from '@/features/settings';
import type { SettingsTab } from '@/features/settings';
import { GeneralTab } from '@/components/settings/general-tab';
import { TokenTab } from '@/components/settings/token-tab';
import { TreasuryTab } from '@/components/settings/treasury-tab';
import { GovernanceTab } from '@/components/settings/governance-tab';
import { SprintsTab } from '@/components/settings/sprints-tab';
import { MembersTab } from '@/components/settings/members-tab';
import { RewardsTab } from '@/components/settings/rewards-tab';
import { GamificationTab } from '@/components/settings/gamification-tab';
import type { OrganizationWithVoting } from '@/features/settings';

interface AccordionPanel {
  key: SettingsTab;
  icon: LucideIcon;
  isGovernance?: boolean;
}

const PANELS: AccordionPanel[] = [
  { key: 'general', icon: Settings },
  { key: 'token', icon: Coins },
  { key: 'treasury', icon: Wallet },
  { key: 'governance', icon: Vote, isGovernance: true },
  { key: 'sprints', icon: Zap },
  { key: 'members', icon: Users },
  { key: 'rewards', icon: Gift },
  { key: 'gamification', icon: Sparkles },
];

function getSummary(tab: SettingsTab, org: OrganizationWithVoting, t: ReturnType<typeof useTranslations>): string {
  switch (tab) {
    case 'general':
      return org.name || t('accordion.noValue');
    case 'token':
      return org.token_symbol
        ? `${org.token_symbol} · ${org.token_decimals ?? 9} decimals`
        : t('accordion.noValue');
    case 'treasury':
      return org.treasury_wallet
        ? `${org.treasury_wallet.slice(0, 6)}...${org.treasury_wallet.slice(-4)}`
        : t('accordion.noValue');
    case 'governance': {
      const vc = org.voting_config;
      if (!vc) return t('accordion.noValue');
      return `Quorum ${vc.quorum_percent ?? 0}% · Approval ${vc.approval_threshold_percent ?? 0}% · Duration ${vc.voting_duration_days ?? 0}d`;
    }
    case 'sprints':
      return `Capacity ${org.default_sprint_capacity ?? 0}pts · Duration ${org.default_sprint_duration_days ?? 0}d`;
    case 'members':
      return t('accordion.manageMembersDesc');
    case 'rewards':
      return org.rewards_config ? t('accordion.configured') : t('accordion.noValue');
    case 'gamification':
      return t('accordion.gamificationDesc');
    default:
      return '';
  }
}

export default function AdminSettingsPage() {
  const t = useTranslations('Settings');
  const { profile } = useAuth();
  const { data: org, isLoading } = useOrganization();
  const [openPanels, setOpenPanels] = useState<Set<SettingsTab>>(new Set());

  const isAdmin = profile?.role === 'admin';
  const isCouncil = profile?.role === 'council';
  const hasAccess = isAdmin;

  const togglePanel = useCallback((tab: SettingsTab) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) {
        next.delete(tab);
      } else {
        next.add(tab);
      }
      return next;
    });
  }, []);

  const renderTabContent = (tab: SettingsTab) => {
    if (!org) return null;
    switch (tab) {
      case 'general':
        return <GeneralTab org={org} />;
      case 'token':
        return <TokenTab org={org} />;
      case 'treasury':
        return <TreasuryTab org={org} />;
      case 'governance':
        return <GovernanceTab votingConfig={org.voting_config} governancePolicy={org.governance_policy} />;
      case 'sprints':
        return <SprintsTab org={org} />;
      case 'members':
        return <MembersTab />;
      case 'rewards':
        return <RewardsTab org={org} />;
      case 'gamification':
        return <GamificationTab org={org} />;
    }
  };

  if (!hasAccess) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-16">
          <ShieldAlert aria-hidden="true" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('accessDenied')}</h2>
          <p className="text-muted-foreground">{t('accessDeniedDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!org) {
    return (
      <PageContainer width="narrow">
        <p className="text-muted-foreground">{t('orgNotFound')}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <div data-testid="admin-settings-page">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Settings aria-hidden="true" className="w-6 h-6 text-organic-orange" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          {isCouncil && !isAdmin && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
              <ShieldAlert aria-hidden="true" className="w-3 h-3" /> {t('readOnlyNotice')}
            </div>
          )}
        </div>

        {/* Accordion Panels */}
        <div className="space-y-3">
          {PANELS.map((panel) => {
            const Icon = panel.icon;
            const isOpen = openPanels.has(panel.key);
            const isGov = panel.isGovernance;
            const summary = getSummary(panel.key, org, t);

            return (
              <div
                key={panel.key}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  isGov
                    ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/50'
                    : 'border-border bg-card'
                }`}
                data-testid={`settings-accordion-${panel.key}`}
              >
                {/* Collapsed header row */}
                <button
                  onClick={() => togglePanel(panel.key)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                    isGov ? 'hover:bg-amber-100/50' : ''
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isGov ? 'text-amber-600' : 'text-muted-foreground'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {t(`tabs.${panel.key}`)}
                      </span>
                      {isGov && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          {t('accordion.criticalGovernance')}
                        </span>
                      )}
                    </div>
                    {!isOpen && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {summary}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Expanded content */}
                <div
                  className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="border-t border-border p-6">
                    {renderTabContent(panel.key)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
