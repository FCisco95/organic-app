'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { useOrganization } from '@/features/settings';
import type { SettingsTab } from '@/features/settings';
import { SettingsTabs } from '@/components/settings/settings-tabs';
import { GeneralTab } from '@/components/settings/general-tab';
import { TokenTab } from '@/components/settings/token-tab';
import { TreasuryTab } from '@/components/settings/treasury-tab';
import { GovernanceTab } from '@/components/settings/governance-tab';
import { SprintsTab } from '@/components/settings/sprints-tab';
import { MembersTab } from '@/components/settings/members-tab';
import { RewardsTab } from '@/components/settings/rewards-tab';

export default function AdminSettingsPage() {
  const t = useTranslations('Settings');
  const { profile } = useAuth();
  const { data: org, isLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const isAdmin = profile?.role === 'admin';
  const isCouncil = profile?.role === 'council';
  const hasAccess = isAdmin || isCouncil;

  if (!hasAccess) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-16">
          <ShieldAlert aria-hidden="true" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('accessDenied')}</h2>
          <p className="text-gray-500">{t('accessDeniedDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!org) {
    return (
      <PageContainer width="narrow">
        <p className="text-gray-500">{t('orgNotFound')}</p>
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
    }
  };

  return (
    <PageContainer width="wide">
      <div data-testid="admin-settings-page">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Settings aria-hidden="true" className="w-6 h-6 text-organic-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-gray-500">{t('description')}</p>
        {isCouncil && !isAdmin && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <ShieldAlert aria-hidden="true" className="w-3 h-3" /> {t('readOnlyNotice')}
          </div>
        )}
      </div>

      {/* Layout: sidebar tabs + content */}
      <div className="flex flex-col md:flex-row gap-6">
        <div data-testid="admin-settings-tabs">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 min-w-0" data-testid="admin-settings-content">
          {renderTabContent()}
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
