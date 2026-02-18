'use client';

import { useAuth } from '@/features/auth/context';
import { PageContainer } from '@/components/layout/page-container';
import { TemplateManager } from '@/components/tasks/template-manager';
import { TemplatePicker } from '@/components/tasks/template-picker';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function TemplatesPage() {
  const t = useTranslations('Tasks.templates');
  const { user, profile } = useAuth();
  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

  if (!user) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
          <h2 className="text-lg font-semibold text-gray-700">{t('signInRequired')}</h2>
          <p className="text-sm mt-1">{t('signInRequiredHint')}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="rounded-2xl border border-organic-orange/20 bg-gradient-to-r from-organic-orange/10 via-white to-organic-yellow/10 p-6">
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-organic-orange to-organic-yellow" />
        </div>

        {/* Admin template management */}
        {isAdminOrCouncil && <TemplateManager />}

        {/* All members can view and instantiate templates */}
        {!isAdminOrCouncil && (
          <TemplatePicker />
        )}
      </div>
    </PageContainer>
  );
}
