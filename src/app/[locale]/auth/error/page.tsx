'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { AuthSplitPanel } from '@/components/auth/auth-split-panel';

export default function AuthErrorPage() {
  const t = useTranslations('AuthError');

  return (
    <div className="min-h-dvh flex flex-col md:flex-row" data-testid="auth-error-page">
      {/* Left panel - branding (desktop only) */}
      <AuthSplitPanel
        title={t('leftPanelTitle')}
        subtitle={t('leftPanelSubtitle')}
        footer={t('leftPanelFooter')}
        logoAlt={t('logoAlt')}
      />

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6 md:p-10 lg:p-14 min-h-dvh md:min-h-0">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 flex justify-center">
          <Link href="/">
            <Image
              src="/organic-logo.png"
              alt={t('logoAlt')}
              width={1000}
              height={335}
              className="w-full max-w-[180px]"
              priority
            />
          </Link>
        </div>

        {/* Card with Alt A styling + Alt C shadow */}
        <div className="w-full max-w-[400px] bg-card rounded-lg border border-border shadow-xl shadow-[0_0_40px_rgba(217,93,57,0.08)] overflow-hidden">
          {/* Subtle terracotta accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-organic-terracotta to-transparent" />

          <div className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>

            <h1 className="text-2xl font-light text-foreground">{t('title')}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t('description')}</p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-colors hover:bg-cta-hover"
              >
                {t('backToLogin')}
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                {t('goHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
