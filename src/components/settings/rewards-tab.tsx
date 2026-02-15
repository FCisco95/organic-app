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
};

export function RewardsTab({ org }: RewardsTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const config = org.rewards_config ?? DEFAULT_CONFIG;

  const [enabled, setEnabled] = useState(config.enabled);
  const [rate, setRate] = useState(String(config.points_to_token_rate));
  const [minThreshold, setMinThreshold] = useState(String(config.min_claim_threshold));
  const [epochPool, setEpochPool] = useState(String(config.default_epoch_pool));
  const [requireWallet, setRequireWallet] = useState(config.claim_requires_wallet);

  useEffect(() => {
    const c = org.rewards_config ?? DEFAULT_CONFIG;
    setEnabled(c.enabled);
    setRate(String(c.points_to_token_rate));
    setMinThreshold(String(c.min_claim_threshold));
    setEpochPool(String(c.default_epoch_pool));
    setRequireWallet(c.claim_requires_wallet);
  }, [org]);

  const dirty =
    enabled !== config.enabled ||
    rate !== String(config.points_to_token_rate) ||
    minThreshold !== String(config.min_claim_threshold) ||
    epochPool !== String(config.default_epoch_pool) ||
    requireWallet !== config.claim_requires_wallet;

  const handleSave = () => {
    updateOrg.mutate({
      rewards_config: {
        enabled,
        points_to_token_rate: Number(rate),
        min_claim_threshold: Number(minThreshold),
        default_epoch_pool: Number(epochPool),
        claim_requires_wallet: requireWallet,
      },
    });
  };

  const handleReset = () => {
    setEnabled(config.enabled);
    setRate(String(config.points_to_token_rate));
    setMinThreshold(String(config.min_claim_threshold));
    setEpochPool(String(config.default_epoch_pool));
    setRequireWallet(config.claim_requires_wallet);
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

      <SettingsSaveBar
        dirty={dirty}
        saving={updateOrg.isPending}
        onSave={handleSave}
        onReset={handleReset}
        saveLabel={t('save')}
      />
    </div>
  );
}
