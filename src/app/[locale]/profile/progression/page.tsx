'use client';

import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';
import { useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { ProgressionShell } from '@/components/gamification/progression-shell';

export default function ProfileProgressionPage() {
  const t = useTranslations('Gamification');
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get('from');
  const sourceContext =
    fromParam === 'tasks' || fromParam === 'proposals' || fromParam === 'profile'
      ? fromParam
      : null;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <PageContainer width="narrow">
        <p className="text-sm text-gray-500">{t('loading')}</p>
      </PageContainer>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageContainer width="narrow">
      <div data-testid="profile-progression-page">
        <Link
          href="/profile"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToProfile')}
        </Link>
        <ProgressionShell sourceContext={sourceContext} />
      </div>
    </PageContainer>
  );
}
