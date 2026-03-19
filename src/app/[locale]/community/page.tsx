'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout';
import {
  CommunityHero,
  CommunityTabs,
  RankingsTab,
  DirectoryTab,
  type CommunityTab,
} from '@/components/community';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('rankings');

  return (
    <PageContainer width="default">
      <CommunityHero />
      <CommunityTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className={activeTab === 'rankings' ? '' : 'hidden'}>
        <RankingsTab />
      </div>
      <div className={activeTab === 'directory' ? '' : 'hidden'}>
        <DirectoryTab />
      </div>
    </PageContainer>
  );
}
