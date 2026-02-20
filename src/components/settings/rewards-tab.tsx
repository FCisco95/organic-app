'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization } from '@/features/settings';

interface RewardsTabProps {
  org: Organization;
}

const DEFAULT_CONFIG = {
  enabled: false,
  points_to_token_rate: 100,
  min_claim_threshold: 500,
  default_epoch_pool: 0,
  claim_requires_wallet: true,
  settlement_emission_percent: 0.01,
  settlement_fixed_cap_per_sprint: 10000,
  settlement_carryover_sprint_cap: 3,
  treasury_balance_for_emission: 0,
};

export function RewardsTab({ org }: RewardsTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const config = {
    ...DEFAULT_CONFIG,
    ...(org.rewards_config ?? {}),
  };

  const [enabled, setEnabled] = useState(config.enabled);
  const [rate, setRate] = useState(String(config.points_to_token_rate));
  const [minThreshold, setMinThreshold] = useState(String(config.min_claim_threshold));
  const [epochPool, setEpochPool] = useState(String(config.default_epoch_pool));
  const [requireWallet, setRequireWallet] = useState(config.claim_requires_wallet);
  const [emissionPercent, setEmissionPercent] = useState(String(config.settlement_emission_percent));
  const [fixedCap, setFixedCap] = useState(String(config.settlement_fixed_cap_per_sprint));
  const [carryoverCap, setCarryoverCap] = useState(String(config.settlement_carryover_sprint_cap));
  const [treasuryBalanceForEmission, setTreasuryBalanceForEmission] = useState(
    String(config.treasury_balance_for_emission)
  );

  useEffect(() => {
    const c = {
      ...DEFAULT_CONFIG,
      ...(org.rewards_config ?? {}),
    };
    setEnabled(c.enabled);
    setRate(String(c.points_to_token_rate));
    setMinThreshold(String(c.min_claim_threshold));
    setEpochPool(String(c.default_epoch_pool));
    setRequireWallet(c.claim_requires_wallet);
    setEmissionPercent(String(c.settlement_emission_percent));
    setFixedCap(String(c.settlement_fixed_cap_per_sprint));
    setCarryoverCap(String(c.settlement_carryover_sprint_cap));
    setTreasuryBalanceForEmission(String(c.treasury_balance_for_emission));
  }, [org]);

  const dirty =
    enabled !== config.enabled ||
    rate !== String(config.points_to_token_rate) ||
    minThreshold !== String(config.min_claim_threshold) ||
    epochPool !== String(config.default_epoch_pool) ||
    requireWallet !== config.claim_requires_wallet ||
    emissionPercent !== String(config.settlement_emission_percent) ||
    fixedCap !== String(config.settlement_fixed_cap_per_sprint) ||
    carryoverCap !== String(config.settlement_carryover_sprint_cap) ||
    treasuryBalanceForEmission !== String(config.treasury_balance_for_emission);

  const handleSave = (reason: string) => {
    updateOrg.mutate({
      reason,
      rewards_config: {
        enabled,
        points_to_token_rate: Number(rate),
        min_claim_threshold: Number(minThreshold),
        default_epoch_pool: Number(epochPool),
        claim_requires_wallet: requireWallet,
        settlement_emission_percent: Number(emissionPercent),
        settlement_fixed_cap_per_sprint: Number(fixedCap),
        settlement_carryover_sprint_cap: Number(carryoverCap),
        treasury_balance_for_emission: Number(treasuryBalanceForEmission),
      },
    });
  };

  const handleReset = () => {
    setEnabled(config.enabled);
    setRate(String(config.points_to_token_rate));
    setMinThreshold(String(config.min_claim_threshold));
    setEpochPool(String(config.default_epoch_pool));
    setRequireWallet(config.claim_requires_wallet);
    setEmissionPercent(String(config.settlement_emission_percent));
    setFixedCap(String(config.settlement_fixed_cap_per_sprint));
    setCarryoverCap(String(config.settlement_carryover_sprint_cap));
    setTreasuryBalanceForEmission(String(config.treasury_balance_for_emission));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.rewards')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('rewards.description')}</p>

      <SettingsField label={t('rewards.enabled')} description={t('rewards.enabledDescription')}>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-organic-orange' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </SettingsField>

      <SettingsField label={t('rewards.rate')} description={t('rewards.rateDescription')}>
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            min={1}
            className="w-28"
          />
          <span className="text-sm text-gray-500">{t('rewards.pointsPerToken')}</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('rewards.minThreshold')}
        description={t('rewards.minThresholdDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={minThreshold}
            onChange={(e) => setMinThreshold(e.target.value)}
            min={0}
            className="w-28"
          />
          <span className="text-sm text-gray-500">{t('rewards.points')}</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('rewards.defaultEpochPool')}
        description={t('rewards.defaultEpochPoolDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={epochPool}
            onChange={(e) => setEpochPool(e.target.value)}
            min={0}
            step="0.001"
            className="w-32"
          />
          <span className="text-sm text-gray-500">ORG</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('rewards.requireWallet')}
        description={t('rewards.requireWalletDescription')}
      >
        <button
          onClick={() => setRequireWallet(!requireWallet)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            requireWallet ? 'bg-organic-orange' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              requireWallet ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </SettingsField>

      <SettingsField
        label={t('rewards.settlementEmissionPercent')}
        description={t('rewards.settlementEmissionPercentDescription')}
      >
        <SettingsInput
          type="number"
          value={emissionPercent}
          onChange={(e) => setEmissionPercent(e.target.value)}
          min={0.0001}
          max={1}
          step={0.0001}
          className="w-36"
        />
      </SettingsField>

      <SettingsField
        label={t('rewards.settlementFixedCap')}
        description={t('rewards.settlementFixedCapDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={fixedCap}
            onChange={(e) => setFixedCap(e.target.value)}
            min={0}
            step={0.001}
            className="w-36"
          />
          <span className="text-sm text-gray-500">ORG</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('rewards.settlementCarryoverCap')}
        description={t('rewards.settlementCarryoverCapDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={carryoverCap}
            onChange={(e) => setCarryoverCap(e.target.value)}
            min={1}
            max={3}
            className="w-24"
          />
          <span className="text-sm text-gray-500">{t('rewards.sprints')}</span>
        </div>
      </SettingsField>

      <SettingsField
        label={t('rewards.treasuryBalanceForEmission')}
        description={t('rewards.treasuryBalanceForEmissionDescription')}
      >
        <div className="flex items-center gap-2">
          <SettingsInput
            type="number"
            value={treasuryBalanceForEmission}
            onChange={(e) => setTreasuryBalanceForEmission(e.target.value)}
            min={0}
            step={0.001}
            className="w-36"
          />
          <span className="text-sm text-gray-500">ORG</span>
        </div>
      </SettingsField>

      <SettingsSaveBar
        dirty={dirty}
        saving={updateOrg.isPending}
        onSave={handleSave}
        onReset={handleReset}
        saveLabel={t('save')}
        reasonLabel={t('auditReasonLabel')}
        reasonPlaceholder={t('auditReasonPlaceholder')}
        reasonHelp={t('auditReasonHelp')}
      />
    </div>
  );
}
