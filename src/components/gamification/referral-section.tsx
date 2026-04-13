'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Users, TrendingUp, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReferralStats } from '@/features/gamification/hooks';
import { cn } from '@/lib/utils';

/** Semantic tier colors — real metal hex values (Bronze, Silver, Gold) */
const TIERS = [
  { name: 'Bronze', color: '#CD7F32', min: 0 },
  { name: 'Silver', color: '#C0C0C0', min: 5 },
  { name: 'Gold', color: '#FFD700', min: 15 },
] as const;

export function ReferralSection() {
  const t = useTranslations('Referrals');
  const { data: stats, isLoading } = useReferralStats();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-muted rounded w-1/4" />
          <div className="h-10 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const currentTierIndex = TIERS.findIndex((tier) => tier.name === stats.current_tier.name);
  const nextTier = TIERS[currentTierIndex + 1];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-organic-terracotta mb-1">
            {t('sectionLabel')}
          </p>
          <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
        </div>
      </div>

      {/* Tier stepper */}
      <div className="flex items-center justify-center gap-0 mb-5">
        {TIERS.map((tier, i) => {
          const isActive = i === currentTierIndex;
          const isPast = i < currentTierIndex;
          const isFuture = i > currentTierIndex;

          return (
            <div key={tier.name} className="flex items-center">
              {/* Connector line (before circle, except first) */}
              {i > 0 && (
                <div
                  className={cn(
                    'h-0.5 w-8 sm:w-12',
                    isPast || isActive ? 'bg-current' : 'bg-muted'
                  )}
                  style={isPast || isActive ? { backgroundColor: TIERS[Math.min(i, currentTierIndex)].color } : undefined}
                />
              )}

              {/* Tier circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isFuture && 'border-2 border-muted text-muted-foreground'
                  )}
                  style={{
                    ...(isActive ? {
                      backgroundColor: `${tier.color}30`,
                      color: tier.color,
                      border: `2px solid ${tier.color}`,
                      boxShadow: `0 0 12px ${tier.color}50`,
                    } : isPast ? {
                      backgroundColor: tier.color,
                      color: '#111827',
                    } : {}),
                  }}
                >
                  {isPast ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    tier.name.charAt(0)
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {tier.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Next reward messaging */}
      {nextTier && (
        <p className="text-center text-xs text-muted-foreground mb-5">
          Next reward at {nextTier.min} referrals
        </p>
      )}

      {/* Referral Link & Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase mb-1.5">
            {t('linkLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={stats.referral_link}
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground font-mono truncate"
            />
            <button
              onClick={() => handleCopy(stats.referral_link, 'link')}
              className="shrink-0 p-2 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('copyLink')}
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase mb-1.5">
            {t('codeLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={stats.code}
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground font-mono tracking-wider text-center"
            />
            <button
              onClick={() => handleCopy(stats.code, 'code')}
              className="shrink-0 p-2 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('copyCode')}
            >
              {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('usageStat')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-foreground tabular-nums">
            {stats.total_referrals}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('completedOf', { completed: stats.completed_referrals, total: stats.total_referrals })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('xpEarnedStat')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-organic-terracotta tabular-nums">
            {stats.total_xp_earned.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('xpLabel')}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('pointsEarnedStat')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-foreground tabular-nums">
            {stats.total_points_earned.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('pointsLabel')}</p>
        </div>
      </div>
    </div>
  );
}
