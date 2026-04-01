'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { isMarketplaceEnabled } from '@/config/feature-flags';
import { useActiveBoosts, useMyBoosts, useCancelBoost } from '@/features/marketplace/hooks';
import { BoostCard } from '@/components/marketplace/boost-card';
import { CreateBoostDialog } from '@/components/marketplace/create-boost-dialog';
import { EngageDialog } from '@/components/marketplace/engage-dialog';
import { PageHero } from '@/components/ui/page-hero';
import { Megaphone, Plus, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarketplaceTab = 'active' | 'my-boosts';

export default function MarketplacePage() {
  const t = useTranslations('Marketplace');
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const enabled = isMarketplaceEnabled();

  const [activeTab, setActiveTab] = useState<MarketplaceTab>('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [engageBoostId, setEngageBoostId] = useState<string | null>(null);

  const { data: activeBoosts, isLoading: boostsLoading } = useActiveBoosts({
    enabled: enabled && activeTab === 'active',
  });
  const { data: myBoosts, isLoading: myBoostsLoading } = useMyBoosts({
    enabled: enabled && isAuthenticated && activeTab === 'my-boosts',
  });
  const { mutate: cancelBoost } = useCancelBoost();

  if (!enabled) {
    return (
      <PageContainer layout="fluid">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Lock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{t('disabledTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('disabledDesc')}</p>
        </div>
      </PageContainer>
    );
  }

  const tabs: { key: MarketplaceTab; label: string }[] = [
    { key: 'active', label: t('tabActive') },
    { key: 'my-boosts', label: t('tabMyBoosts') },
  ];

  const currentBoosts = activeTab === 'active' ? activeBoosts : myBoosts;
  const isLoading = activeTab === 'active' ? boostsLoading : myBoostsLoading;

  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        {/* Hero */}
        <PageHero icon={Megaphone} title={t('title')} description={t('description')} />

        {/* Tab bar + create button */}
        <div className="flex items-center justify-between border-b border-border opacity-0 animate-fade-up stagger-2">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.key
                    ? 'border-organic-terracotta text-organic-terracotta dark:text-[#E8845C] font-bold bg-organic-terracotta-lightest dark:bg-organic-terracotta-lightest0/5 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isAuthenticated && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cta text-cta-fg text-sm font-medium px-3 py-2 hover:bg-cta-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('createBoost')}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="opacity-0 animate-fade-up stagger-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !currentBoosts || currentBoosts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {activeTab === 'active' ? t('noActiveBoosts') : t('noMyBoosts')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentBoosts.map((boost) => (
                <BoostCard
                  key={boost.id}
                  boost={boost}
                  isOwner={boost.user_id === user?.id}
                  onEngage={(id) => setEngageBoostId(id)}
                  onCancel={(id) => cancelBoost(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateBoostDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
      {engageBoostId && (
        <EngageDialog
          open={!!engageBoostId}
          boostId={engageBoostId}
          onClose={() => setEngageBoostId(null)}
        />
      )}
    </PageContainer>
  );
}
