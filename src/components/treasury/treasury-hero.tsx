'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, ExternalLink, Shield, Users, Scale } from 'lucide-react';
import type { TreasuryTrustMeta } from '@/features/treasury';

interface TreasuryHeroProps {
  walletAddress: string;
  trust: TreasuryTrustMeta | null | undefined;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function getSettlementTone(status: TreasuryTrustMeta['latest_settlement']['status']) {
  switch (status) {
    case 'committed':
      return 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10';
    case 'held':
      return 'text-amber-300 border-amber-400/40 bg-amber-500/10';
    case 'killed':
      return 'text-rose-300 border-rose-400/40 bg-rose-500/10';
    case 'pending':
      return 'text-sky-300 border-sky-400/40 bg-sky-500/10';
    default:
      return 'text-gray-300 border-gray-400/40 bg-white/5';
  }
}

export function TreasuryHero({ walletAddress, trust }: TreasuryHeroProps) {
  const t = useTranslations('Treasury');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const settlementStatus = trust?.latest_settlement.status ?? null;
  const settlementStatusKey =
    settlementStatus != null ? `settlementStatus.${settlementStatus}` : 'settlementStatus.unknown';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 text-white">
      <div className="max-w-5xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('heroTitle')}</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
          {t('heroDescription')}
        </p>

        {/* Principles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Shield className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('principleSecurityTitle')}</p>
              <p className="text-xs text-gray-400">{t('principleSecurityDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Users className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('principleGovernanceTitle')}</p>
              <p className="text-xs text-gray-400">{t('principleGovernanceDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Scale className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('principleTransparencyTitle')}</p>
              <p className="text-xs text-gray-400">{t('principleTransparencyDesc')}</p>
            </div>
          </div>
        </div>

        {/* Wallet address */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            {t('walletLabel')}
          </span>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
            <code className="text-sm font-mono text-gray-200">
              <span className="hidden sm:inline">{walletAddress}</span>
              <span className="sm:hidden">{shortAddress}</span>
            </code>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={copied ? t('copied') : t('copyAddress')}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <a
            href={`https://solscan.io/account/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {t('viewOnSolscan')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-300">
              {t('emissionPolicyTitle')}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  {t('policyEmissionPercent')}
                </p>
                <p className="mt-1 text-sm font-semibold text-white" data-testid="treasury-policy-emission">
                  {trust ? formatPercent(trust.emission_policy.settlement_emission_percent) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  {t('policyFixedCap')}
                </p>
                <p className="mt-1 text-sm font-semibold text-white" data-testid="treasury-policy-fixed-cap">
                  {trust ? `${trust.emission_policy.settlement_fixed_cap_per_sprint.toLocaleString()} ORG` : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  {t('policyCarryoverCap')}
                </p>
                <p className="mt-1 text-sm font-semibold text-white" data-testid="treasury-policy-carryover">
                  {trust ? `${trust.emission_policy.settlement_carryover_sprint_cap}` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-gray-300">
                {t('latestSettlementTitle')}
              </p>
              <span
                data-testid="treasury-latest-settlement-status"
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getSettlementTone(
                  settlementStatus
                )}`}
              >
                {t(settlementStatusKey)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-300" data-testid="treasury-latest-settlement-detail">
              {trust?.latest_settlement.blocked_reason
                ? trust.latest_settlement.blocked_reason
                : t('latestSettlementDescription')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-300">
              <span>{t('latestSettlementCap', { cap: trust?.latest_settlement.emission_cap ?? 0 })}</span>
              <span>{t('latestSettlementCarryover', { amount: trust?.latest_settlement.carryover_amount ?? 0 })}</span>
              <a
                href={trust?.audit_log_link ?? '/admin/settings'}
                className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200"
                data-testid="treasury-audit-link"
              >
                {t('auditTrailLink')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
