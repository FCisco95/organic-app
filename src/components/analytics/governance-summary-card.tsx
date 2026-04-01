'use client';

import { useTranslations } from 'next-intl';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGovernanceSummary } from '@/features/ai/hooks';
import { cn } from '@/lib/utils';
import type { GovernanceKeyMetric } from '@/features/ai/types';

interface GovernanceSummaryCardProps {
  variant?: 'compact' | 'full';
}

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
} as const;

const TREND_COLORS = {
  up: 'text-emerald-500',
  down: 'text-red-500',
  stable: 'text-gray-400',
} as const;

const SENTIMENT_CONFIG = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
  caution: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
  critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
} as const;

function MetricPill({ metric }: { metric: GovernanceKeyMetric }) {
  const TrendIcon = TREND_ICONS[metric.trend];
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
      <TrendIcon className={cn('h-3.5 w-3.5', TREND_COLORS[metric.trend])} />
      <span className="text-xs font-medium text-foreground">{metric.value}</span>
      <span className="text-[10px] text-muted-foreground">{metric.label}</span>
    </div>
  );
}

export function GovernanceSummaryCard({ variant = 'compact' }: GovernanceSummaryCardProps) {
  const t = useTranslations('Analytics.aiSummary');
  const { data: summary, isLoading } = useGovernanceSummary();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-card ring-1 ring-border p-5 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-3" />
        <div className="h-4 w-full bg-muted rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl bg-white dark:bg-card ring-1 ring-border p-5 text-center">
        <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t('noSummary')}</p>
      </div>
    );
  }

  const content = summary.content;
  const sentimentConfig = SENTIMENT_CONFIG[content.sentiment] ?? SENTIMENT_CONFIG.healthy;
  const SentimentIcon = sentimentConfig.icon;

  return (
    <div className={cn(
      'rounded-2xl bg-white dark:bg-card ring-1 ring-border p-5',
      variant === 'full' && 'space-y-4'
    )}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('rounded-lg p-2', sentimentConfig.bg)}>
          <Brain className={cn('h-4 w-4', sentimentConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
              sentimentConfig.bg, sentimentConfig.color, sentimentConfig.border
            )}>
              <SentimentIcon className="h-3 w-3" />
              {t(`sentiment.${content.sentiment}`)}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{content.headline}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="flex flex-wrap gap-2 mb-3">
        {content.key_metrics.slice(0, variant === 'compact' ? 4 : 6).map((metric, i) => (
          <MetricPill key={i} metric={metric} />
        ))}
      </div>

      {/* Insights (full variant only) */}
      {variant === 'full' && content.insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('insights')}
          </h4>
          <ul className="space-y-1.5">
            {content.insights.map((insight, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-organic-terracotta mt-1">&#x2022;</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks (full variant only) */}
      {variant === 'full' && content.risks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('risks')}
          </h4>
          <ul className="space-y-1.5">
            {content.risks.map((risk, i) => (
              <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {t('generatedBy', { model: summary.model_used })}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(summary.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
