'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Users, TrendingUp, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReferralStats } from '@/features/gamification/hooks';
import { Badge } from '@/components/ui/badge';

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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded-lg" />
            <div className="h-20 bg-gray-200 rounded-lg" />
            <div className="h-20 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-xl border border-orange-200/60 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-organic-orange mb-1">
            {t('sectionLabel')}
          </p>
          <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
        </div>
        <Badge
          className="text-xs font-semibold"
          style={{
            backgroundColor: stats.current_tier.name === 'Gold' ? '#FEF3C7' : stats.current_tier.name === 'Silver' ? '#F3F4F6' : '#FED7AA',
            color: stats.current_tier.name === 'Gold' ? '#92400E' : stats.current_tier.name === 'Silver' ? '#374151' : '#9A3412',
          }}
        >
          {stats.current_tier.name}
        </Badge>
      </div>

      {/* Referral Link & Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
            {t('linkLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={stats.referral_link}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-mono truncate"
            />
            <button
              onClick={() => handleCopy(stats.referral_link, 'link')}
              className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title={t('copyLink')}
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
            {t('codeLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={stats.code}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono tracking-wider text-center"
            />
            <button
              onClick={() => handleCopy(stats.code, 'code')}
              className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title={t('copyCode')}
            >
              {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">{t('usageStat')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-gray-900 tabular-nums">
            {stats.total_referrals}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('completedOf', { completed: stats.completed_referrals, total: stats.total_referrals })}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">{t('xpEarnedStat')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-organic-orange tabular-nums">
            {stats.total_xp_earned.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{t('xpLabel')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">{t('pointsEarnedStat')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-gray-900 tabular-nums">
            {stats.total_points_earned.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{t('pointsLabel')}</p>
        </div>
      </div>
    </div>
  );
}
