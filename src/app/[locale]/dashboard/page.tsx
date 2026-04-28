'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';
import { useAuth } from '@/features/auth/context';
import { getBranding } from '@/lib/tenant/branding';
import type { TenantBranding } from '@/lib/tenant/types';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    getBranding().then(setBranding);
  }, []);

  useEffect(() => {
    if (!branding) return;
    document.title = `${t('pageTitle')} — ${branding.communityName}`;
    return () => {
      document.title = branding.communityName;
    };
  }, [branding, t]);

  const isAuthenticated = !!user;

  if (!branding) {
    return (
      <PageContainer layout="fluid">
        <div className="h-screen animate-pulse rounded-2xl bg-muted/40" />
      </PageContainer>
    );
  }

  return (
    <PageContainer layout="fluid">
      <div className="space-y-6">
        <SectionPlaceholder testId="dashboard-masthead" labelKey="sections.masthead" />
        <SectionPlaceholder testId="dashboard-sprint-hero" labelKey="sections.sprintHero" />
        <SectionPlaceholder testId="dashboard-stat-strip" labelKey="sections.statStrip" />
        <SectionPlaceholder
          testId="dashboard-two-column"
          labelKey={isAuthenticated ? 'sections.myContributions' : 'sections.invitation'}
        />
        <SectionPlaceholder testId="dashboard-activity-digest" labelKey="sections.activityDigest" />
        <SectionPlaceholder testId="dashboard-testimonials" labelKey="sections.testimonials" />
        <SectionPlaceholder testId="dashboard-footer" labelKey="sections.footer" />
      </div>
    </PageContainer>
  );
}

interface SectionPlaceholderProps {
  testId: string;
  labelKey: string;
}

function SectionPlaceholder({ testId, labelKey }: SectionPlaceholderProps) {
  const t = useTranslations('Dashboard');
  return (
    <section
      data-testid={testId}
      className="rounded-2xl border border-dashed border-border bg-card p-8"
    >
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {t(labelKey)}
      </h2>
      <p className="mt-2 text-xs text-muted-foreground/70">{t('placeholderHint')}</p>
    </section>
  );
}
