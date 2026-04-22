'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { UnauthFallback } from '@/components/ui/unauth-fallback';
import {
  CommunityHero,
  CommunityTabs,
  RankingsTab,
  DirectoryTab,
  type CommunityTab,
} from '@/components/community';
import { useLeaderboard } from '@/features/reputation';
import { useAuth } from '@/features/auth/context';

export default function CommunityPage() {
  const t = useTranslations('Community');
  const tFallback = useTranslations('UnauthFallback');
  const [activeTab, setActiveTab] = useState<CommunityTab>('rankings');

  // Dynamic page title
  useEffect(() => {
    document.title = 'Community — Organic';
    return () => {
      document.title = 'Organic';
    };
  }, []);
  const { user, loading: authLoading } = useAuth();
  const showUnauthFallback = !authLoading && !user;
  const { data: leaderboard = [], isError: leaderboardError } = useLeaderboard({
    enabled: !showUnauthFallback,
  });

  const { totalMembers, activeThisSprint, streakCount } = useMemo(() => {
    const total = leaderboard.length;
    const active = leaderboard.filter((e) => e.xp_total > 0).length;
    // streakCount would need streak data; for now derive from active as a proxy
    return {
      totalMembers: total > 0 ? total : undefined,
      activeThisSprint: total > 0 ? active : undefined,
      streakCount: undefined as number | undefined,
    };
  }, [leaderboard]);

  const currentUserProfileHref = user?.id ? `/community/${user.id}` : undefined;

  return (
    <PageContainer width="default">
      {leaderboardError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4">
          <p className="text-sm text-destructive">{t('leaderboardError')}</p>
        </div>
      )}
      <CommunityHero
        totalMembers={totalMembers}
        activeThisSprint={activeThisSprint}
        streakCount={streakCount}
        currentUserProfileHref={currentUserProfileHref}
      />
      {showUnauthFallback ? (
        <div className="mt-6">
          <UnauthFallback
            icon={Users}
            title={tFallback('communityTitle')}
            description={tFallback('communityDescription')}
            returnTo="/community"
          />
        </div>
      ) : (
        <>
          <CommunityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            rankingsCount={totalMembers}
            directoryCount={totalMembers}
          />
          <div className={activeTab === 'rankings' ? '' : 'hidden'}>
            <RankingsTab />
          </div>
          <div className={activeTab === 'directory' ? '' : 'hidden'}>
            <DirectoryTab />
          </div>
        </>
      )}
    </PageContainer>
  );
}
