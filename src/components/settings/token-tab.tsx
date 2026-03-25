'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization } from '@/features/settings';
import { X, Plus } from 'lucide-react';

interface TokenTabProps {
  org: Organization;
}

export function TokenTab({ org }: TokenTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const [tokenSymbol, setTokenSymbol] = useState(org.token_symbol);
  const [tokenMint, setTokenMint] = useState(org.token_mint ?? '');
  const [tokenDecimals, setTokenDecimals] = useState(String(org.token_decimals));
  const [tokenTotalSupply, setTokenTotalSupply] = useState(String(org.token_total_supply));

  // Token analytics config
  const analyticsConfig = org.token_analytics_config ?? { lp_vault_exclusions: [], dexscreener_pair: null };
  const [lpVaults, setLpVaults] = useState<string[]>(analyticsConfig.lp_vault_exclusions);
  const [dexPair, setDexPair] = useState(analyticsConfig.dexscreener_pair ?? '');
  const [newVault, setNewVault] = useState('');

  useEffect(() => {
    setTokenSymbol(org.token_symbol);
    setTokenMint(org.token_mint ?? '');
    setTokenDecimals(String(org.token_decimals));
    setTokenTotalSupply(String(org.token_total_supply));
    const config = org.token_analytics_config ?? { lp_vault_exclusions: [], dexscreener_pair: null };
    setLpVaults(config.lp_vault_exclusions);
    setDexPair(config.dexscreener_pair ?? '');
  }, [org]);

  const dirty =
    tokenSymbol !== org.token_symbol ||
    tokenMint !== (org.token_mint ?? '') ||
    tokenDecimals !== String(org.token_decimals) ||
    tokenTotalSupply !== String(org.token_total_supply) ||
    JSON.stringify(lpVaults) !== JSON.stringify(analyticsConfig.lp_vault_exclusions) ||
    dexPair !== (analyticsConfig.dexscreener_pair ?? '');

  const handleAddVault = () => {
    const trimmed = newVault.trim();
    if (trimmed.length >= 32 && !lpVaults.includes(trimmed)) {
      setLpVaults([...lpVaults, trimmed]);
      setNewVault('');
    }
  };

  const handleRemoveVault = (address: string) => {
    setLpVaults(lpVaults.filter((v) => v !== address));
  };

  const handleSave = (reason: string) => {
    updateOrg.mutate({
      reason,
      token_symbol: tokenSymbol,
      token_mint: tokenMint || null,
      token_decimals: Number(tokenDecimals),
      token_total_supply: Number(tokenTotalSupply),
      token_analytics_config: {
        lp_vault_exclusions: lpVaults,
        dexscreener_pair: dexPair || null,
      },
    });
  };

  const handleReset = () => {
    setTokenSymbol(org.token_symbol);
    setTokenMint(org.token_mint ?? '');
    setTokenDecimals(String(org.token_decimals));
    setTokenTotalSupply(String(org.token_total_supply));
    setLpVaults(analyticsConfig.lp_vault_exclusions);
    setDexPair(analyticsConfig.dexscreener_pair ?? '');
    setNewVault('');
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.token')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('token.description')}</p>

      <SettingsField label={t('token.symbol')} description={t('token.symbolDescription')}>
        <SettingsInput
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          maxLength={20}
        />
      </SettingsField>

      <SettingsField label={t('token.mint')} description={t('token.mintDescription')}>
        <SettingsInput
          value={tokenMint}
          onChange={(e) => setTokenMint(e.target.value)}
          placeholder="e.g. DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk"
          className="font-mono text-xs"
        />
      </SettingsField>

      <SettingsField label={t('token.decimals')}>
        <SettingsInput
          type="number"
          value={tokenDecimals}
          onChange={(e) => setTokenDecimals(e.target.value)}
          min={0}
          max={18}
        />
      </SettingsField>

      <SettingsField label={t('token.totalSupply')}>
        <SettingsInput
          type="number"
          value={tokenTotalSupply}
          onChange={(e) => setTokenTotalSupply(e.target.value)}
          min={1}
        />
      </SettingsField>

      {/* Analytics Configuration */}
      <div className="mt-8 mb-4 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('token.analyticsTitle')}</h3>
        <p className="text-xs text-gray-500 mb-4">{t('token.analyticsDescription')}</p>
      </div>

      <SettingsField
        label={t('token.lpVaults')}
        description={t('token.lpVaultsDescription')}
      >
        <div className="space-y-2">
          {lpVaults.map((vault) => (
            <div
              key={vault}
              className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2"
            >
              <code className="flex-1 text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                {vault}
              </code>
              <button
                type="button"
                onClick={() => handleRemoveVault(vault)}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <SettingsInput
              value={newVault}
              onChange={(e) => setNewVault(e.target.value)}
              placeholder={t('token.lpVaultPlaceholder')}
              className="font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddVault();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddVault}
              disabled={newVault.trim().length < 32}
              className="shrink-0 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 text-xs font-medium disabled:opacity-30 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </SettingsField>

      <SettingsField
        label={t('token.dexPair')}
        description={t('token.dexPairDescription')}
      >
        <SettingsInput
          value={dexPair}
          onChange={(e) => setDexPair(e.target.value)}
          placeholder={t('token.dexPairPlaceholder')}
          className="font-mono text-xs"
        />
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
