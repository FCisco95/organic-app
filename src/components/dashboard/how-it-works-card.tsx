'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Coins,
  GitPullRequestArrow,
  Twitter,
  Lock,
} from 'lucide-react';

export function HowItWorksCard() {
  const t = useTranslations('HowItWorks');
  const [isExpanded, setIsExpanded] = useState(true);

  const sections = [
    {
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      titleKey: 'xpTitle' as const,
      bodyKey: 'xpBody' as const,
    },
    {
      icon: Coins,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      titleKey: 'pointsTitle' as const,
      bodyKey: 'pointsBody' as const,
    },
    {
      icon: GitPullRequestArrow,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      titleKey: 'pipelineTitle' as const,
      bodyKey: 'pipelineBody' as const,
    },
    {
      icon: Twitter,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      titleKey: 'xTitle' as const,
      bodyKey: 'xBody' as const,
    },
    {
      icon: Lock,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      titleKey: 'perksTitle' as const,
      bodyKey: 'perksBody' as const,
    },
  ] as const;

  return (
    <section className="rounded-xl border border-organic-orange/20 bg-organic-orange/5 p-5 sm:p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.titleKey}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`rounded-md p-1.5 ${section.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${section.color}`} />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {t(section.titleKey)}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(section.bodyKey)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
