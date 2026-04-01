'use client';

import { useTranslations } from 'next-intl';
import { Rocket, Check, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIERS = [
  { id: 'seed', emoji: '🌱', features: 6, visible: 2 },
  { id: 'grove', emoji: '🌿', features: 8, visible: 2 },
  { id: 'forest', emoji: '🌲', features: 10, visible: 2 },
] as const;

export default function ForProjectsPage() {
  const t = useTranslations('ForProjects');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-organic-terracotta/5 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-organic-terracotta/10 text-organic-terracotta text-xs font-medium mb-6">
            <Rocket className="h-3.5 w-3.5" />
            {t('badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('heroSubtitle')}
          </p>
          <p className="text-sm text-muted-foreground/70">
            {t('socialProof')}
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('tiersTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('tiersSubtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => (
            <div
              key={tier.id}
              className={cn(
                'relative rounded-2xl border p-6 flex flex-col',
                i === 1
                  ? 'border-organic-terracotta/40 bg-organic-terracotta/5 ring-1 ring-organic-terracotta/20'
                  : 'border-border bg-card'
              )}
            >
              {i === 1 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-organic-terracotta text-white text-[10px] font-bold uppercase tracking-wider">
                  {t('recommended')}
                </span>
              )}

              <div className="text-3xl mb-3">{tier.emoji}</div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {t(`tier_${tier.id}_name`)}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t(`tier_${tier.id}_desc`)}
              </p>

              {/* Visible features */}
              <div className="space-y-2 mb-3">
                {Array.from({ length: tier.visible }, (_, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-organic-terracotta shrink-0" />
                    <span>{t(`tier_${tier.id}_feature_${j + 1}`)}</span>
                  </div>
                ))}
              </div>

              {/* Blurred features */}
              <div className="relative space-y-2 mb-6">
                {Array.from({ length: tier.features - tier.visible }, (_, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 text-sm text-muted-foreground/30 blur-[3px] select-none pointer-events-none"
                  >
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{t(`tier_${tier.id}_blurred_${j + 1}`)}</span>
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {t('comingSoon')}
                  </span>
                </div>
              </div>

              <div className="mt-auto">
                <div className="text-lg font-bold text-foreground mb-1">
                  {t(`tier_${tier.id}_price`)}
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  {t(`tier_${tier.id}_priceNote`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('ctaTitle')}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t('ctaSubtitle')}</p>
          <a
            href="mailto:organic_community+marketing@proton.me?subject=Platform%20Beta%20Interest"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cta text-cta-fg font-medium hover:bg-cta-hover transition-colors"
          >
            <Mail className="h-4 w-4" />
            {t('ctaButton')}
          </a>
          <p className="text-xs text-muted-foreground/60 mt-4">
            {t('ctaFootnote')}
          </p>
        </div>
      </section>
    </div>
  );
}
