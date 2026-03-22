'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  ShieldAlert,
  Coins,
  Wallet,
  Vote,
  Zap,
  Users,
  Gift,
  Sparkles,
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

interface TabDef {
  key: SettingsTab;
  icon: LucideIcon;
}

interface TabGroup {
  labelKey: string;
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    labelKey: 'settingsGroups.organization',
    tabs: [
      { key: 'general', icon: Settings },
      { key: 'token', icon: Coins },
      { key: 'treasury', icon: Wallet },
    ],
  },
  {
    labelKey: 'settingsGroups.governance',
    tabs: [
      { key: 'governance', icon: Vote },
      { key: 'sprints', icon: Zap },
    ],
  },
  {
    labelKey: 'settingsGroups.operations',
    tabs: [
      { key: 'members', icon: Users },
      { key: 'rewards', icon: Gift },
      { key: 'gamification', icon: Sparkles },
    ],
  },
];

const ALL_TABS: TabDef[] = TAB_GROUPS.flatMap((g) => g.tabs);

export default function AdminSettingsPage() {
  const t = useTranslations('Settings');
  const { profile } = useAuth();
  const { data: org, isLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const isAdmin = profile?.role === 'admin';
  const isCouncil = profile?.role === 'council';
  const hasAccess = isAdmin;

  if (!hasAccess) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-16">
          <ShieldAlert aria-hidden="true" className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('accessDenied')}</h2>
          <p className="text-muted-foreground">{t('accessDeniedDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded-xl" />
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

  const renderTabContent = () => {
    switch (activeTab) {
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

        {/* Layout: grouped sidebar nav + content */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop vertical nav with groups */}
          <nav className="hidden md:flex flex-col gap-1 min-w-[200px] shrink-0" data-testid="admin-settings-tabs">
            {TAB_GROUPS.map((group, gi) => (
              <div key={group.labelKey} className={gi > 0 ? 'mt-4' : ''}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-3 mb-1.5">
                  {t(group.labelKey)}
                </p>
                {group.tabs.map(({ key, icon: Icon }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-organic-orange/10 text-organic-orange border-l-[3px] border-organic-orange'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {t(`tabs.${key}`)}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Mobile horizontal scroll */}
          <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" data-testid="admin-settings-tabs-mobile">
            {ALL_TABS.map(({ key, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-organic-orange text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(`tabs.${key}`)}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 rounded-xl border border-border bg-card p-6 min-w-0" data-testid="admin-settings-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
