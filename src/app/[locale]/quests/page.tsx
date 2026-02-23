'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { QuestsPage } from '@/components/gamification/quests-page';

export default function QuestsRoute() {
  const t = useTranslations('Quests');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <PageContainer layout="fluid">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!user) return null;

  return (
    <PageContainer layout="fluid">
      <QuestsPage />
    </PageContainer>
  );
}
